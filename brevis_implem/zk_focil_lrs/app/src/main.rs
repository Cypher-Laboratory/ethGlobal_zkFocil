#![no_main]

pico_sdk::entrypoint!(main);
use lsag::lsag_verifier::{Lsag, LsagData, verify_lsag};
use pico_sdk::io::{commit, read_as};

pub fn main() {
    let signature: Lsag = read_as();

    let result = verify_lsag(signature.clone());

    let result = LsagData {
        ring: signature.ring,
        c0: signature.c0,
        message: signature.message,
        responses: signature.responses,
        key_image: signature.key_image,
        linkability_flag: signature.linkability_flag.clone(),
        verified: result,
    };

    commit(&result);
}
