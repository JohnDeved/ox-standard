# Contributing the Semi Rule to oxc

This guide explains how to contribute the native `semi` rule implementation to the oxc-project/oxc repository to enable IDE support and seamless integration.

## Steps to Contribute

### 1. Fork and Clone oxc Repository

```bash
git clone https://github.com/your-username/oxc.git
cd oxc
```

### 2. Add the Semi Rule File

Copy `semi.rs` to the correct location:

```bash
cp /path/to/ox-standard/oxc-contrib/semi.rs crates/oxc_linter/src/rules/eslint/semi.rs
```

### 3. Register the Rule

Edit `crates/oxc_linter/src/rules/eslint/mod.rs` to include the new rule:

```rust
// Add to the module declarations
mod semi;

// Add to the rules! macro
rules! {
    // ... existing rules ...
    semi,
    // ... more rules ...
}
```

### 4. Update Rule Registry

Edit `crates/oxc_linter/src/rules.rs` to register the rule:

```rust
// In the appropriate section, add:
use crate::rules::eslint::semi::Semi;

// In the rules registration:
eslint_rules! {
    // ... existing rules ...
    Semi,
    // ... more rules ...
}
```

### 5. Add Tests

The rule includes comprehensive tests. You may need to update the test infrastructure if needed.

### 6. Update Documentation

Add the rule to the appropriate documentation files:

- `docs/src/rules/eslint.md` - Add documentation for the semi rule
- Update any rule counting or categorization

### 7. Verify Integration

Build and test the changes:

```bash
cargo test -p oxc_linter rules::eslint::semi
cargo build
```

### 8. Submit Pull Request

1. Create a new branch: `git checkout -b feat/eslint-semi-rule`
2. Commit your changes: `git commit -m "feat(linter): add ESLint semi rule"`
3. Push to your fork: `git push origin feat/eslint-semi-rule`
4. Open a PR to oxc-project/oxc

## PR Description Template

```markdown
# Add ESLint semi rule

## Summary

This PR adds the `semi` rule to oxlint, enabling JavaScript Standard Style semicolon enforcement with native IDE support.

## Features

- **Never mode (default)**: Disallows unnecessary semicolons but allows required ones for ASI
- **Always mode**: Requires semicolons at the end of statements  
- **Smart ASI detection**: Identifies when semicolons are needed to prevent automatic semicolon insertion issues
- **Automatic fixing**: Can fix both unnecessary and missing semicolons
- **Full Standard Style compliance**: Follows JavaScript Standard Style guidelines

## Use Cases

- JavaScript Standard Style projects that need semicolon enforcement
- Projects transitioning to/from semicolon usage
- IDE integration for real-time semicolon checking

## Testing

The implementation includes comprehensive tests covering:
- Standard Style scenarios (unnecessary semicolons)
- ASI edge cases requiring semicolons
- Always mode behavior
- Auto-fixing capabilities

## Breaking Changes

None - this is a new rule addition.

## Related Issues

- Enables native IDE support for ox-standard projects
- Replaces need for external JavaScript-based semicolon checking
```

## Code Review Considerations

When submitting this PR, expect reviewers to check:

1. **Performance**: The rule should not significantly impact linting performance
2. **Accuracy**: ASI detection logic should be robust and match ESLint behavior
3. **Test Coverage**: All edge cases should be covered
4. **Documentation**: Rule behavior should be clearly documented
5. **Integration**: Rule should integrate cleanly with existing oxc infrastructure

## Alternative: Plugin Architecture

If oxc develops a plugin system, this rule could also be distributed as a plugin rather than being built into the core. Monitor oxc development for plugin capabilities.

## Maintenance

Once merged, the rule will be maintained by the oxc team. For ox-standard specific needs:

1. File issues in oxc repository for rule bugs
2. Update ox-standard to use the native rule instead of JavaScript extension
3. Remove the JavaScript semicolon extension once native rule is available

## Timeline

The oxc project moves quickly, but new rules need careful review. Expect:

- Initial review: 1-2 weeks
- Iterations based on feedback: Variable
- Merge timeline: Depends on oxc release schedule

## Documentation Links

- [oxc Contributing Guide](https://oxc.rs/docs/contribute/overview.html)
- [Adding Rules Guide](https://oxc.rs/docs/contribute/linter/adding-rules.html)
- [oxc Rule Architecture](https://oxc.rs/docs/contribute/linter/rule-architecture.html)