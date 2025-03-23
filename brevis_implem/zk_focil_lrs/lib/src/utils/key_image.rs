use k256::{AffinePoint, Scalar, elliptic_curve::sec1::ToEncodedPoint};
use sha2::{Digest, Sha256};

use crate::utils::hash_to_secp256k1::hash_to_secp256k1;
use crate::utils::serialize_point::serialize_point;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct KeyImage(pub AffinePoint);

impl KeyImage {
    /// Create a new key image from a private key
    ///
    /// # Arguments
    /// * `private_key` - The private key to derive the key image from
    /// * `linkability_flag` - Optional string for linkability, affects the key image derivation
    ///
    /// # Returns
    /// * `KeyImage` - The derived key image
    pub fn from_private_key(private_key: &Scalar, linkability_flag: Option<String>) -> Self {
        let public_key = (AffinePoint::GENERATOR * private_key).to_affine();
        let mapped =
            hash_to_secp256k1(serialize_point(public_key) + &linkability_flag.unwrap_or_default());
        let key_image_point = (mapped * private_key).to_affine();

        KeyImage(key_image_point)
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        self.0.to_encoded_point(false).as_bytes().to_vec()
    }

    pub fn point(&self) -> AffinePoint {
        self.0
    }

    pub fn from_point(point: AffinePoint) -> Self {
        KeyImage(point)
    }

    pub fn hash(&self) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(self.to_bytes());
        hasher.finalize().into()
    }

    pub fn hash_to_u64(&self) -> u64 {
        let hash = self.hash();
        let mut result = 0u64;
        for (i, &byte) in hash.iter().enumerate().take(8) {
            result |= (byte as u64) << (i * 8);
        }
        result
    }
}

/// Check if a validator is selected as an includer based on their key image
///
/// # Arguments
/// * `key_image` - The validator's key image
/// * `validator_count` - The total number of validators
/// * `target_includers` - The target number of includers to select
///
/// # Returns
/// * `bool` - True if the validator is selected as an includer
pub fn is_includer_from_key_image(
    key_image: &KeyImage,
    validator_count: usize,
    target_includers: usize,
) -> bool {
    let modulo = std::cmp::max(1, validator_count / target_includers);
    let random_value = key_image.hash_to_u64();

    // Check if this validator is selected
    random_value % (modulo as u64) == 0
}
