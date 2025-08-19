# Native oxc Semi Rule Implementation

This directory contains a native Rust implementation of the `semi` rule for oxc/oxlint.
This implementation can be contributed to the oxc-project/oxc repository to provide
native IDE support and seamless integration with oxlint's existing infrastructure.

## Contents

- `semi.rs` - The main rule implementation following oxc patterns
- `CONTRIBUTING.md` - Instructions for contributing this to oxc
- `README.md` - Implementation details and usage

## Why Native Implementation?

The JavaScript extension approach (semi-rule-extension.js) works for CLI usage but doesn't provide:
- Real-time IDE feedback and error highlighting
- Language server integration
- Seamless integration with oxlint's existing output format
- Performance benefits of native Rust implementation

## Next Steps

This implementation needs to be contributed to oxc-project/oxc to be officially supported.
See CONTRIBUTING.md for detailed instructions.