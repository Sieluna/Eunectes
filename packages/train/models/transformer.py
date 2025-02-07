from x_transformers import TransformerWrapper, Decoder
from x_transformers.autoregressive_wrapper import AutoregressiveWrapper

def get_decoder(args):
    return AutoregressiveWrapper(
        TransformerWrapper(
            num_tokens=args.num_tokens,
            max_seq_len=args.max_seq_len,
            attn_layers=Decoder(
                dim=args.dim,
                depth=args.num_layers,
                heads=args.heads,
                **args.decoder_args
            )),
        pad_value=args.pad_token)
