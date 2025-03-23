sp1_zkvm::entrypoint!(main);

use lsag::lsag_verifier::{Lsag, LsagData, verify_lsag};

pub fn main() {
    let signature: Lsag = sp1_zkvm::io::read();
    let result = verify_lsag(signature.clone());

    let result_data = LsagData {
        ring: signature.ring,
        c0: signature.c0,
        message: signature.message,
        responses: signature.responses,
        key_image: signature.key_image,
        linkability_flag: signature.linkability_flag.clone(),
        verified: result,
    };
    sp1_zkvm::io::commit(&result_data);
}
