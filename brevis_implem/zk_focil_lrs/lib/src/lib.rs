pub mod utils;
pub mod lsag_verifier;

use elliptic_curve::PrimeField;
pub use k256;
pub use elliptic_curve;


use crate::utils::keccak256::keccak_256;
use crate::utils::scalar_from_hex::scalar_from_hex;
use crate::utils::serialize_point::serialize_point;
use crate::utils::serialize_ring::serialize_ring;
use crate::utils::hash_to_secp256k1::hash_to_secp256k1;
use crate::utils::hex_to_decimal::hex_to_decimal;
use crate::lsag_verifier::{Lsag, Params, compute_c};
use k256::{AffinePoint, Scalar};
use rand;
use rand_core::RngCore;

#[derive(Debug)]
pub struct SigningDetails {
    pub private_key: Scalar,
    pub public_key: AffinePoint,
    pub index: usize,
}

/// Sign a message with a linkable ring signature
/// 
/// # Arguments
/// * `message` - The message to sign
/// * `ring` - The ring of public keys
/// * `signer_details` - Details about the signer (private key, public key, position in ring)
/// * `linkability_flag` - Optional string for linkability
/// 
/// # Returns
/// * `Lsag` - The LSAG signature
pub fn sign_lsag(
    message: String,
    ring: &[AffinePoint], 
    signer_details: &SigningDetails,
    linkability_flag: Option<String>,
) -> Lsag {
    // Validate input
    if signer_details.index >= ring.len() {
        panic!("Signer index is out of bounds");
    }
    
    if ring[signer_details.index] != signer_details.public_key {
        panic!("Public key at the specified index does not match the signer's public key");
    }
    
    let message_digest = keccak_256(&[message.clone()]);
    let serialized_ring = serialize_ring(ring);
    
    let mut random_bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut random_bytes);
    let alpha = Scalar::from_repr(random_bytes.into()).unwrap_or_else(|| {
        // In the rare case we get zero, try again
        let mut new_bytes = [0u8; 32];
        rand::rng().fill_bytes(&mut new_bytes);
        Scalar::from_repr(new_bytes.into()).unwrap()
    });
    
    let mapped = hash_to_secp256k1(
        serialize_point(signer_details.public_key) 
        + &linkability_flag.clone().unwrap_or("".to_string()),
    );
    
    let key_image = (mapped * signer_details.private_key).to_affine();
    let mut responses = vec![Scalar::ZERO; ring.len()];
    
    for i in 0..ring.len() {
        if i != signer_details.index {
            let mut bytes = [0u8; 32];
            rand::rng().fill_bytes(&mut bytes);
            responses[i] = Scalar::from_repr(bytes.into()).unwrap_or(Scalar::ONE);
        }
    }
    
    let g = AffinePoint::GENERATOR;  
    let r_l = (g * alpha).to_affine();
    let r_r = (mapped * alpha).to_affine();
    
    let hash_content = "".to_string()
        + &serialized_ring
        + &hex_to_decimal(&message_digest).unwrap()
        + &serialize_point(r_l)
        + &serialize_point(r_r);

    let c_next = scalar_from_hex(&keccak_256(&[hash_content])).unwrap();
    let mut c_i = c_next;
    

    for i in 1..ring.len() {
        let current_idx = (signer_details.index + i) % ring.len(); 
        let params = Params {
            index: (current_idx + 1) % ring.len(),
            previous_r: responses[current_idx],
            previous_c: c_i,
            previous_index: current_idx,
            key_image,
            linkability_flag: linkability_flag.clone(),
        };
        
        c_i = compute_c(
            ring,
            serialized_ring.clone(),
            message_digest.clone(),
            &params,
        );
    }
    
    let c_0 = c_i;
    responses[signer_details.index] = alpha - c_0 * signer_details.private_key;
    
    Lsag {
        ring: ring.to_vec(),
        message: message,
        c0: c_0,
        responses,
        key_image,
        linkability_flag,
    }
}

pub fn generate_keypair() -> (Scalar, AffinePoint) {
    let mut random_bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut random_bytes);
    let scalar = Scalar::from_repr(random_bytes.into()).unwrap();
    let public_key = (AffinePoint::GENERATOR * scalar).to_affine();
    
    (scalar, public_key)
}

pub fn create_signing_details(private_key: Scalar, ring: &[AffinePoint]) -> SigningDetails {
    let public_key = (AffinePoint::GENERATOR * private_key).to_affine();
    let index = ring.iter().position(|&p| p == public_key)
        .expect("Public key not found in the ring");
    
    SigningDetails {
        private_key,
        public_key,
        index,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lsag_verifier::verify_lsag;
    
    #[test]
    fn test_sign_and_verify() {
        // Generate some key pairs
        let (private_key1, public_key1) = generate_keypair();
        let (_, public_key2) = generate_keypair();
        let (_, public_key3) = generate_keypair();

        let ring = vec![public_key1, public_key2, public_key3];
        
        let signing_details = SigningDetails {
            private_key: private_key1,
            public_key: public_key1,
            index: 0,
        };
        
        let message = "test message".to_string();
        let linkability_flag = Some("linkability test".to_string());
        
        let signature = sign_lsag(
            message,
            &ring,
            &signing_details,
            linkability_flag,
        );
        let is_valid = verify_lsag(signature);
        
        assert!(is_valid, "Signature verification failed");
    }
}