use k256::{
    ecdsa::{SigningKey, VerifyingKey},
    elliptic_curve::{sec1::ToEncodedPoint, PrimeField},
    Scalar, ProjectivePoint,
};
use sha2::{Sha256, Digest};
use rand_core::OsRng;

/// The target number of includers to select in the lottery
const TARGET_N_INCLUDERS: usize = 64;

/// Represents the beacon chain state (simplified for testing)
pub struct BeaconState {
    /// The list of validators in the system
    pub validators: Vec<Validator>,
    /// Current epoch
    pub current_epoch: u64,
}

/// Represents a validator in the system
pub struct Validator {
    /// The validator's public key
    pub public_key: VerifyingKey,
    /// Index in the validator registry
    pub index: usize,
}

/// Represents a slot in the beacon chain
pub type Slot = u64;

/// Represents an epoch in the beacon chain
pub type Epoch = u64;

/// Compute the epoch at a given slot
pub fn compute_epoch_at_slot(slot: Slot) -> Epoch {
    // Simplified: In Ethereum, this would use SLOTS_PER_EPOCH
    slot / 32
}

/// Domain types for hashing
pub enum Domain {
    DOMAIN_IL,  // Inclusion List domain
}

/// Get the domain for signing based on the state and domain type
pub fn get_domain(state: &BeaconState, domain_type: Domain, epoch: Epoch) -> [u8; 32] {
    // In a real implementation, this would compute a domain based on fork version, etc.
    // For testing, we'll just use a simple hash
    let mut hasher = Sha256::new();
    match domain_type {
        Domain::DOMAIN_IL => hasher.update(b"INCLUSION_LIST"),
    }
    let epoch_bytes = epoch.to_le_bytes();
    hasher.update(epoch_bytes);
    hasher.finalize().into()
}

/// Compute a signing root for a message with a domain
pub fn compute_signing_root(message: &[u8], domain: [u8; 32]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(message);
    hasher.update(domain);
    hasher.finalize().into()
}

/// A key image derived from a secret key
pub struct KeyImage(pub ProjectivePoint);

impl KeyImage {
    /// Convert the key image to bytes for usage in predicates
    pub fn to_bytes(&self) -> Vec<u8> {
        self.0.to_affine().to_encoded_point(false).as_bytes().to_vec()
    }
}

/// Generate a key image from a signing key
pub fn generate_key_image(signing_key: &SigningKey) -> KeyImage {
    // In a real LRS scheme, this would use a specific method to derive a unique key image
    // For testing, we'll just derive it from the private key directly
    let secret_scalar = signing_key.as_scalar_primitive();
    let generator = ProjectivePoint::generator();
    
    // Generate H(sk) * G where H is a hash function and G is the generator point
    let mut hasher = Sha256::new();
    let secret_bytes = secret_scalar.to_repr();
    hasher.update(secret_bytes);
    let hash_result = hasher.finalize();
    
    // Convert hash to scalar and multiply by generator
    let mut scalar_bytes = [0u8; 32];
    scalar_bytes.copy_from_slice(&hash_result);
    let derived_scalar = Scalar::from_bytes_reduced(&scalar_bytes.into());
    
    KeyImage(generator * derived_scalar)
}

/// Convert bytes to a u64
pub fn bytes_to_uint64(bytes: &[u8]) -> u64 {
    let mut result = 0u64;
    for (i, &byte) in bytes.iter().enumerate().take(8) {
        result |= (byte as u64) << (i * 8);
    }
    result
}

/// Check if a validator is an includer for a given slot
pub fn is_includer(
    state: &BeaconState, 
    slot: Slot, 
    signing_key: &SigningKey,
) -> bool {
    let domain = get_domain(
        state, 
        Domain::DOMAIN_IL, 
        compute_epoch_at_slot(slot)
    );
    
    let slot_bytes = slot.to_le_bytes();
    let signing_root = compute_signing_root(&slot_bytes, domain);
    
    // Generate the key image
    let key_image = generate_key_image(signing_key);
    
    // Check if the validator is selected as an includer
    is_includer_impl(state, &key_image)
}

/// Implementation of the includer selection logic
pub fn is_includer_impl(state: &BeaconState, key_image: &KeyImage) -> bool {
    let modulo = std::cmp::max(1, state.validators.len() / TARGET_N_INCLUDERS);
    
    // Hash the key image to get a random value
    let mut hasher = Sha256::new();
    hasher.update(key_image.to_bytes());
    let hash_result = hasher.finalize();
    
    // Use the first 8 bytes to get a u64
    let random_value = bytes_to_uint64(&hash_result[0..8]);
    
    // Check if this validator is selected
    random_value % (modulo as u64) == 0
}

pub fn run_lottery_simulation(num_validators: usize, slot: Slot) -> (Vec<usize>, f64) {
    let mut validators = Vec::with_capacity(num_validators);
    let mut private_keys = Vec::with_capacity(num_validators);
    
    for i in 0..num_validators {
        let signing_key = SigningKey::random(&mut OsRng);
        let verifying_key = VerifyingKey::from(&signing_key);
        
        validators.push(Validator {
            public_key: verifying_key,
            index: i,
        });
        
        private_keys.push(signing_key);
    }
    
    
    let state = BeaconState {
        validators,
        current_epoch: compute_epoch_at_slot(slot),
    };
    
    
    let mut winners = Vec::new();
    for (i, key) in private_keys.iter().enumerate() {
        if is_includer(&state, slot, key) {
            winners.push(i);
        }
    }
    
    let percentage = (winners.len() as f64) / (num_validators as f64) * 100.0;
    (winners, percentage)
}