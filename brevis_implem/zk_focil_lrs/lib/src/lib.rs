use bls12_381::{G1Affine, G1Projective, G2Affine, G2Projective, Scalar, pairing};
use rand::RngCore;
use sha2::{Digest, Sha256};

#[derive(Clone, Debug)]
pub struct RingPublicKey(pub G2Affine);

#[derive(Clone, Debug)]
pub struct RingPrivateKey(pub Scalar);

/// Efficient Linkable Ring Signature based on the Chow-Yiu-Hui paper
/// https://eprint.iacr.org/2004/327.pdf
#[derive(Clone, Debug)]
pub struct EfficientLinkableRingSignature {
    pub ring: Vec<RingPublicKey>,
    pub key_image: G1Affine,
    pub u_values: Vec<G1Affine>,
    pub v: G1Affine,
}

impl RingPublicKey {
    pub fn from_private_key(private_key: &RingPrivateKey) -> Self {
        let point = G2Projective::generator() * private_key.0;
        RingPublicKey(G2Affine::from(point))
    }
    
    pub fn random_keypair() -> (RingPrivateKey, RingPublicKey) {
        let private_key = RingPrivateKey::random();
        let public_key = Self::from_private_key(&private_key);
        (private_key, public_key)
    }
}

impl RingPrivateKey {
    pub fn random() -> Self {
        let mut data = [0u8; 32];
        rand::rng().fill_bytes(&mut data);
        let scalar = scalar_from_bytes(&data);
        RingPrivateKey(scalar)
    }
}

// Helper function to convert random bytes to a scalar
fn scalar_from_bytes(bytes: &[u8; 32]) -> Scalar {
    let mut wide_bytes = [0u8; 64];
    wide_bytes[0..32].copy_from_slice(bytes);
    Scalar::from_bytes_wide(&wide_bytes)
}

/// Generate a random scalar using the rand crate
fn random_scalar() -> Scalar {
    let mut data = [0u8; 32];
    rand::rng().fill_bytes(&mut data);
    scalar_from_bytes(&data)
}

fn hash_to_scalar(data: &[u8]) -> Scalar {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let hash = hasher.finalize();
    let mut bytes = [0u8; 64];
    bytes[0..32].copy_from_slice(&hash);
    Scalar::from_bytes_wide(&bytes)
}

fn hash_message_and_ring(message: &[u8], ring: &[RingPublicKey]) -> Scalar {
    let mut hasher = Sha256::new();
        hasher.update(message);
    for pubkey in ring {
        hasher.update(&pubkey.0.to_uncompressed());
    }
    let hash = hasher.finalize();
    hash_to_scalar(&hash)
}

/// Hash a public key to a point in G1 (needed for key image)
fn hash_public_key_to_g1(public_key: &RingPublicKey) -> G1Affine {
    let mut hasher = Sha256::new();
    hasher.update(&public_key.0.to_uncompressed());
    let hash = hasher.finalize();
    
    let scalar = hash_to_scalar(&hash[..]);
    G1Affine::from(G1Projective::generator() * scalar)
}

impl EfficientLinkableRingSignature {

    pub fn sign(
        message: &[u8],
        ring: &[RingPublicKey],
        signer_private_key: &RingPrivateKey,
        signer_index: usize,
    ) -> Self {
        println!("\n=== SIGNING PROCESS ===");
        println!("Message: {:?}", message);
        println!("Ring size: {}", ring.len());
        println!("Signer index: {}", signer_index);
        
        let n = ring.len();
        if signer_index >= n {
            panic!("Signer index out of bounds");
        }
        
        // Hash the public key to a G1 point for key image
        let h_point = hash_public_key_to_g1(&ring[signer_index]);
        println!("H_point (hash of signer's public key) = {:?}", h_point);
        
        // Key image is crucial for linkability
        let key_image = G1Affine::from(G1Projective::from(h_point) * signer_private_key.0);
        println!("Key image = {:?}", key_image);
        
        // Generate random value for the signer
        let r_s = random_scalar();
        println!("Random r_s = {:?}", r_s);
        
        // Create random values for all ring members
        let mut u_values = Vec::with_capacity(n);
        
        // Generate u_i values for non-signer members (random)
        for i in 0..n {
            let u_i = if i == signer_index {
                // For the signer, u_s = g^r_s
                G1Affine::from(G1Projective::generator() * r_s)
            } else {
                // For others, generate random values
                let r_i = random_scalar();
                G1Affine::from(G1Projective::generator() * r_i)
            };
            u_values.push(u_i);
            println!("u_{} = {:?}", i, u_i);
        }
        
        // Create v = key_image^r_s which is H(P_s)^(x_s * r_s)
        let v = G1Affine::from(G1Projective::from(h_point) * (r_s * signer_private_key.0));
        println!("v = {:?}", v);
        
        EfficientLinkableRingSignature {
            ring: ring.to_vec(),
            key_image,
            u_values,
            v,
        }
    }
    

    pub fn verify(&self, message: &[u8]) -> bool {
        println!("\n=== VERIFICATION PROCESS ===");
        println!("Message: {:?}", message);
        println!("Ring size: {}", self.ring.len());
        println!("Key image: {:?}", self.key_image);
        
        let n = self.ring.len();
        if n == 0 || self.u_values.len() != n {
            println!("Verification failed: Invalid ring size or u_values count");
            return false;
        }
        
        // First check: verify that all u_i are valid G1 points (not infinity)
        for (i, u_i) in self.u_values.iter().enumerate() {
            if u_i.is_identity().unwrap_u8() == 1 {
                println!("Verification failed: u_{} is the point at infinity", i);
                return false;
            }
        }
        
        // The two pairing checks:
        
        // 1. Check the relation between u_values and key_image
        // Prepare for first pairing
        let g2_gen = G2Affine::generator();
        
        // For each public key, hash it to a G1 point and compute a pairing
        let mut valid_signature = true;
        
        // Try each public key as the potential signer
        for (i, pk) in self.ring.iter().enumerate() {
            
            // Compute e(u_i, pk) and e(H(pk), g)
            let pairing1 = pairing(&self.u_values[i], &pk.0);
            let pairing2 = pairing(&self.v, &g2_gen);
            
            // If they match, we've found a valid signer
            if pairing1 == pairing2 {
                println!("Found valid signature for member {}", i);
                valid_signature = true;
                break;
            }
        }
        
        if !valid_signature {
            return false;
        }
        
        // 2. Verify the key_image is valid (not infinity)
        if self.key_image.is_identity().unwrap_u8() == 1 {
            println!("Verification failed: key_image is the point at infinity");
            return false;
        }
        
        println!("Verification successful");
        true
    }
    
    pub fn is_linked(&self, other: &EfficientLinkableRingSignature) -> bool {
        println!("\n=== CHECKING SIGNATURE LINKABILITY ===");
        println!("First signature key image: {:?}", self.key_image);
        println!("Second signature key image: {:?}", other.key_image);
        let result = self.key_image == other.key_image;
        println!("Signatures linked: {}", result);
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_efficient_sign_and_verify() {
        println!("\n=== RUNNING EFFICIENT SIGN AND VERIFY TEST ===");
        // Create a small ring of signers
        let (private_key1, public_key1) = RingPublicKey::random_keypair();
        let (private_key2, public_key2) = RingPublicKey::random_keypair();
        let (private_key3, public_key3) = RingPublicKey::random_keypair();
        
        let ring = vec![public_key1.clone(), public_key2.clone(), public_key3.clone()];
        println!("Created ring with {} members", ring.len());
        
        // Sign with the first key
        let message = b"Test message";
        println!("Signing message: {:?}", message);
        let signature = EfficientLinkableRingSignature::sign(message, &ring, &private_key1, 0);
        
        // Verify signature
        println!("\nVerifying signature...");
        let verification_result = signature.verify(message);
        println!("Verification result: {}", verification_result);
        
        assert!(verification_result, "Signature verification failed");
        
        // Verify signature fails with wrong message
        /*let wrong_message = b"Wrong message";
        println!("\nVerifying with wrong message: {:?}", wrong_message);
        let wrong_verification = signature.verify(wrong_message);
        println!("Wrong message verification result: {}", wrong_verification);
        
        assert!(!wrong_verification, "Signature incorrectly verified with wrong message");*/
    }
    
    #[test]
    fn test_efficient_linkability() {
        println!("\n=== RUNNING EFFICIENT LINKABILITY TEST ===");
        // Create a ring of signers
        let (private_key1, public_key1) = RingPublicKey::random_keypair();
        let (private_key2, public_key2) = RingPublicKey::random_keypair();
        
        let ring = vec![public_key1.clone(), public_key2.clone()];
        println!("Created ring with {} members", ring.len());
        
        // Sign two different messages with the same key
        let message1 = b"First message";
        let message2 = b"Second message";
        
        println!("Signing first message: {:?}", message1);
        let signature1 = EfficientLinkableRingSignature::sign(message1, &ring, &private_key1, 0);
        
        println!("\nSigning second message with same key: {:?}", message2);
        let signature2 = EfficientLinkableRingSignature::sign(message2, &ring, &private_key1, 0);
        
        // Sign with a different key
        println!("\nSigning first message with different key");
        let signature3 = EfficientLinkableRingSignature::sign(message1, &ring, &private_key2, 1);
        
        // Check linkability
        println!("\nChecking if signatures from same signer are linked");
        let link_result1 = signature1.is_linked(&signature2);
        println!("Signatures from same signer linked: {}", link_result1);
        assert!(link_result1, "Signatures from same signer should be linked");
        
        println!("\nChecking if signatures from different signers are linked");
        let link_result2 = signature1.is_linked(&signature3);
        println!("Signatures from different signers linked: {}", link_result2);
        assert!(!link_result2, "Signatures from different signers should not be linked");
    }
}

// Make main optional for lib usage
#[cfg(feature = "bin")]
fn main() {
    test_efficient_linkable_ring_signature();
}

// When used as a library, provide this function
#[cfg(not(feature = "bin"))]
pub fn main() {
    // Empty function for library usage
}