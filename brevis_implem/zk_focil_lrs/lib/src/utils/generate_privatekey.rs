use elliptic_curve::PrimeField;
use k256::{AffinePoint, Scalar};
use rand;
use rand_core::RngCore;

pub fn generate_keypair() -> (Scalar, AffinePoint) {
    let mut random_bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut random_bytes);
    let scalar = Scalar::from_repr(random_bytes.into()).unwrap();
    let public_key = (AffinePoint::GENERATOR * scalar).to_affine();

    (scalar, public_key)
}
