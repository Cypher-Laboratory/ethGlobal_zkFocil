use crate::utils::keccak256::keccak_256;
use crate::utils::scalar_from_hex::scalar_from_hex;
use crate::utils::serialize_point::{deserialize_point, serialize_point};
use crate::utils::serialize_ring::{deserialize_ring, serialize_ring};
use crate::utils::{hash_to_secp256k1::hash_to_secp256k1, hex_to_decimal::hex_to_decimal};
use base64::Engine;
use base64::engine::general_purpose;
use core::str;
use k256::{AffinePoint, Scalar};
use serde::{Deserialize, Serialize};

/// Define a struct that matches the structure of the JSON string LSAG
#[derive(Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct StringifiedLsag {
    pub message: String,
    pub ring: Vec<String>,
    pub c: String,
    pub responses: Vec<String>,
    pub keyImage: String,
    pub linkabilityFlag: String,
}
/// A struct to represent a LSAG signature
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Lsag {
    pub ring: Vec<AffinePoint>,
    pub message: String,
    pub c0: Scalar,
    pub responses: Vec<Scalar>,
    pub key_image: AffinePoint,
    pub linkability_flag: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LsagData {
    pub ring: Vec<AffinePoint>,
    pub message: String,
    pub c0: Scalar,
    pub responses: Vec<Scalar>,
    pub key_image: AffinePoint,
    pub linkability_flag: Option<String>,
    pub verified: bool,
}
/// Parameters required for the compute_c function
pub struct Params {
    pub index: usize,
    pub previous_r: Scalar,
    pub previous_c: Scalar,
    pub previous_index: usize,
    pub linkability_flag: Option<String>,
    pub key_image: AffinePoint,
}

/// Computes the 'cee' value based on the provided parameters
pub fn compute_c(
    ring: &[AffinePoint], // todo: ensure ring is sorted
    serialized_ring: String,
    message_digest: String,
    params: &Params,
    // curve_order: Scalar,
) -> Scalar {
    let g = AffinePoint::GENERATOR;

    let point =
        ((g * params.previous_r) + (ring[params.previous_index] * params.previous_c)).to_affine();

    let mapped = hash_to_secp256k1(
        serialize_point(ring[params.previous_index])
            + &params.linkability_flag.clone().unwrap_or("".to_string()),
    );

    let hash_content = "".to_string()
        + &serialized_ring
        + &hex_to_decimal(&message_digest).unwrap()
        + &serialize_point(point)
        + &serialize_point(
            ((mapped * params.previous_r) + (params.key_image * params.previous_c)).to_affine(),
        );

    let hash = keccak_256(&[hash_content]);

    scalar_from_hex(&hash).unwrap() // todo: compute mod order: % curve_order;
}

// Function to convert a JSON string into a Rust struct
fn convert_string_to_json(json_str: &str) -> StringifiedLsag {
    // Deserialize the JSON string into the Rust struct
    serde_json::from_str(json_str).unwrap()
}

/// Verify a base64 encoded LSAG signature.
/// Converts a base64 encoded LSAG signature and verifies it.
pub fn verify_b64_lsag(b64_signature: String) -> bool {
    // Decode the base64 string
    let decoded_bytes = general_purpose::STANDARD
        .decode(b64_signature.as_bytes())
        .unwrap();

    // Convert the byte array to utf8 string
    let decoded_string = match str::from_utf8(&decoded_bytes) {
        Ok(ascii) => ascii,
        Err(_) => panic!("Failed to convert decoded bytes to ASCII string"),
    };

    // Convert the string to json
    let json = convert_string_to_json(decoded_string); // Assume the conversion returns a Result

    // Deserialize the ring (handle Result)
    let ring_points = match deserialize_ring(&json.ring) {
        Ok(points) => points,
        Err(e) => {
            println!("Error deserializing ring: {}", e);
            return false; // Return false if deserialization fails
        }
    };

    let key_image = match deserialize_point(json.keyImage.clone()) {
        Ok(point) => point,
        Err(e) => {
            println!("Error deserializing keyImage: {}", e);
            return false; // Return false if deserialization fails
        }
    };

    let responses: Vec<Scalar> = json
        .responses
        .iter()
        .map(|response| scalar_from_hex(response).unwrap())
        .collect();

    // return the result of the verification
    let lsag_signature = Lsag {
        ring: ring_points,
        message: json.message.clone(),
        c0: scalar_from_hex(&json.c).unwrap(),
        responses,
        key_image,
        linkability_flag: Some(json.linkabilityFlag.clone()),
    };

    // Return the result of the verification
    verify_lsag(lsag_signature)
}

/// Verifies a ring signature.
/// Returns `true` if the signature is valid, `false` otherwise.
pub fn verify_lsag(signature: Lsag) -> bool {
    // // Check that all points in the ring are valid // todo: implement for rust
    // for point in ring {
    //     if !check_low_order(point) { // todo: add the check_low_order function
    //         panic!("The public key {:?} is not valid", point);
    //     }
    // }

    // Ensure that the ring and responses have matching lengths
    if signature.ring.len() != signature.responses.len() {
        panic!("Ring and responses must have the same length");
    }
    let message_digest = keccak_256(&[signature.message]);

    let serialized_ring = serialize_ring(&signature.ring);

    // Initialize last_computed_c with c0
    let mut last_computed_c = signature.c0;

    // Compute the c values: c1', c2', ..., cn', c0'
    for i in signature
        .responses
        .iter()
        .enumerate()
        .take(signature.ring.len())
    {
        let params = Params {
            index: (i.0 + 1) % signature.ring.len(),
            previous_r: signature.responses[i.0],
            previous_c: last_computed_c,
            previous_index: i.0,
            key_image: signature.key_image,
            linkability_flag: signature.linkability_flag.clone(),
        };

        let c = compute_c(
            &signature.ring,
            serialized_ring.clone(),
            message_digest.clone(),
            &params,
        );

        last_computed_c = c;
    }

    // Return true if c0 == c0'
    signature.c0 == last_computed_c
}
