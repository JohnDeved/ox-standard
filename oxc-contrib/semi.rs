use oxc_ast::{AstKind, ast::{Statement, Expression}};
use oxc_diagnostics::OxcDiagnostic;
use oxc_macros::declare_oxc_lint;
use oxc_span::{GetSpan, Span};
use serde_json::Value;

use crate::{AstNode, context::LintContext, rule::Rule};

fn semi_unnecessary_diagnostic(span: Span) -> OxcDiagnostic {
    OxcDiagnostic::warn("Unnecessary semicolon")
        .with_help("JavaScript Standard Style: avoid unnecessary semicolons")
        .with_label(span)
}

fn semi_missing_diagnostic(span: Span) -> OxcDiagnostic {
    OxcDiagnostic::warn("Missing semicolon to avoid ASI issues")
        .with_help("Add semicolon to prevent automatic semicolon insertion problems")
        .with_label(span)
}

#[derive(Debug, Clone)]
pub struct SemiConfig {
    /// "never" (default): disallow semicolons except where required for ASI
    /// "always": require semicolons
    mode: SemiMode,
}

#[derive(Debug, Clone, PartialEq)]
enum SemiMode {
    Never,
    Always,
}

impl Default for SemiConfig {
    fn default() -> Self {
        Self {
            mode: SemiMode::Never, // Standard Style default
        }
    }
}

#[derive(Debug, Default, Clone)]
pub struct Semi(Box<SemiConfig>);

declare_oxc_lint!(
    /// ### What it does
    ///
    /// This rule enforces consistent use of semicolons according to JavaScript Standard Style.
    /// By default, it disallows unnecessary semicolons but allows required ones to avoid ASI issues.
    ///
    /// ### Why is this bad?
    ///
    /// JavaScript Standard Style philosophy is to avoid semicolons where they are not needed,
    /// as they add visual clutter without functional benefit in most cases. However, semicolons
    /// are still required in specific situations to avoid problems with Automatic Semicolon
    /// Insertion (ASI).
    ///
    /// ### Examples
    ///
    /// Examples of **incorrect** code for this rule (with "never"):
    /// ```javascript
    /// const message = 'Hello';
    /// console.log(message);
    /// ```
    ///
    /// Examples of **correct** code for this rule (with "never"):
    /// ```javascript
    /// const message = 'Hello'
    /// console.log(message)
    ///
    /// // Required semicolon to avoid ASI issues
    /// const a = 1
    /// ;(function() { console.log('needed') })()
    /// ```
    ///
    /// ### Options
    ///
    /// - `"never"` (default): Disallow unnecessary semicolons (Standard Style)
    /// - `"always"`: Require semicolons at the end of statements
    Semi,
    eslint,
    style,
    fix
);

impl Rule for Semi {
    fn from_configuration(value: Value) -> Self {
        let mode = value
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(Value::as_str)
            .map(|s| match s {
                "always" => SemiMode::Always,
                _ => SemiMode::Never,
            })
            .unwrap_or(SemiMode::Never);

        Self(Box::new(SemiConfig { mode }))
    }

    fn run<'a>(&self, node: &AstNode<'a>, ctx: &LintContext<'a>) {
        match node.kind() {
            // Check statements that can end with semicolons
            AstKind::ExpressionStatement(stmt) => {
                self.check_statement_semi(node, ctx, stmt.span, true);
            }
            AstKind::VariableDeclaration(stmt) => {
                self.check_statement_semi(node, ctx, stmt.span, false);
            }
            AstKind::ReturnStatement(stmt) => {
                self.check_statement_semi(node, ctx, stmt.span, false);
            }
            AstKind::ThrowStatement(stmt) => {
                self.check_statement_semi(node, ctx, stmt.span, false);
            }
            AstKind::BreakStatement(stmt) => {
                self.check_statement_semi(node, ctx, stmt.span, false);
            }
            AstKind::ContinueStatement(stmt) => {
                self.check_statement_semi(node, ctx, stmt.span, false);
            }
            AstKind::ImportDeclaration(stmt) => {
                self.check_statement_semi(node, ctx, stmt.span, false);
            }
            AstKind::ExportNamedDeclaration(stmt) => {
                // Only check exports that don't have declarations
                if stmt.declaration.is_none() {
                    self.check_statement_semi(node, ctx, stmt.span, false);
                }
            }
            AstKind::ExportDefaultDeclaration(stmt) => {
                // Check if it's an expression export
                if matches!(stmt.declaration, oxc_ast::ast::ExportDefaultDeclarationKind::Expression(_)) {
                    self.check_statement_semi(node, ctx, stmt.span, false);
                }
            }
            AstKind::ExportAllDeclaration(stmt) => {
                self.check_statement_semi(node, ctx, stmt.span, false);
            }
            _ => {}
        }
    }
}

impl Semi {
    fn check_statement_semi<'a>(
        &self,
        node: &AstNode<'a>,
        ctx: &LintContext<'a>,
        span: Span,
        is_expression_statement: bool,
    ) {
        let source = ctx.source_range(span);
        let has_semicolon = source.trim_end().ends_with(';');

        match self.0.mode {
            SemiMode::Never => {
                if has_semicolon {
                    // Check if semicolon is required to avoid ASI issues
                    if !self.is_semicolon_required(node, ctx, is_expression_statement) {
                        let semi_pos = self.find_semicolon_position(ctx, span);
                        if let Some(semi_span) = semi_pos {
                            ctx.diagnostic_with_fix(
                                semi_unnecessary_diagnostic(semi_span),
                                |fixer| fixer.delete(&semi_span),
                            );
                        }
                    }
                } else {
                    // Check if missing semicolon could cause ASI issues
                    if self.is_semicolon_required(node, ctx, is_expression_statement) {
                        let end_span = Span::new(span.end, span.end);
                        ctx.diagnostic_with_fix(
                            semi_missing_diagnostic(end_span),
                            |fixer| fixer.insert_text_after_range(span, ";"),
                        );
                    }
                }
            }
            SemiMode::Always => {
                if !has_semicolon && self.should_have_semicolon(node, ctx) {
                    let end_span = Span::new(span.end, span.end);
                    ctx.diagnostic_with_fix(
                        semi_missing_diagnostic(end_span),
                        |fixer| fixer.insert_text_after_range(span, ";"),
                    );
                }
            }
        }
    }

    /// Check if a semicolon is required to avoid ASI issues
    fn is_semicolon_required<'a>(
        &self,
        node: &AstNode<'a>,
        ctx: &LintContext<'a>,
        is_expression_statement: bool,
    ) -> bool {
        // Get the next statement/node
        let next_node = self.get_next_statement(node, ctx);
        
        if let Some(next) = next_node {
            // Check if the next line starts with characters that could cause ASI issues
            let next_source = ctx.source_range(next.span()).trim_start();
            
            // ASI issues occur when next line starts with: ( [ ` + - / * %
            if next_source.starts_with(['(', '[', '`', '+', '-', '/', '*', '%']) {
                // Only required if current statement could be affected
                if is_expression_statement {
                    return true;
                }
                
                // For other statements, check if they end with something that could be continued
                let current_source = ctx.source_range(node.span()).trim_end();
                if current_source.ends_with(|c: char| c.is_alphanumeric() || matches!(c, ')' | ']' | '}' | '_' | '$')) {
                    return true;
                }
            }
        }
        
        false
    }

    /// Check if statement should have semicolon in "always" mode
    fn should_have_semicolon<'a>(&self, node: &AstNode<'a>, _ctx: &LintContext<'a>) -> bool {
        // Most statements should have semicolons in "always" mode
        // Exceptions: block statements, function declarations, etc.
        match node.kind() {
            AstKind::BlockStatement(_)
            | AstKind::FunctionDeclaration(_)
            | AstKind::ClassDeclaration(_)
            | AstKind::IfStatement(_)
            | AstKind::WhileStatement(_)
            | AstKind::ForStatement(_)
            | AstKind::ForInStatement(_)
            | AstKind::ForOfStatement(_)
            | AstKind::DoWhileStatement(_)
            | AstKind::TryStatement(_)
            | AstKind::SwitchStatement(_) => false,
            _ => true,
        }
    }

    /// Find the position of the semicolon in the source
    fn find_semicolon_position(&self, ctx: &LintContext, span: Span) -> Option<Span> {
        let source = ctx.source_range(span);
        if let Some(pos) = source.rfind(';') {
            let semi_start = span.start + u32::try_from(pos).ok()?;
            Some(Span::new(semi_start, semi_start + 1))
        } else {
            None
        }
    }

    /// Get the next statement after the current node
    fn get_next_statement<'a>(&self, node: &AstNode<'a>, ctx: &LintContext<'a>) -> Option<&'a AstNode<'a>> {
        // Find parent that contains a list of statements
        let mut current = node;
        
        while let Some(parent) = ctx.nodes().parent_node(current.id()) {
            match parent.kind() {
                AstKind::Program(program) => {
                    return self.find_next_in_body(&program.body, node, ctx);
                }
                AstKind::BlockStatement(block) => {
                    return self.find_next_in_body(&block.body, node, ctx);
                }
                _ => {
                    current = parent;
                }
            }
        }
        
        None
    }

    /// Find the next statement in a body of statements
    fn find_next_in_body<'a>(
        &self,
        body: &'a oxc_allocator::Vec<Statement<'a>>,
        target_node: &AstNode<'a>,
        ctx: &LintContext<'a>,
    ) -> Option<&'a AstNode<'a>> {
        let target_span = target_node.span();
        
        // Find statement that contains our target node
        let mut target_stmt_index = None;
        for (index, stmt) in body.iter().enumerate() {
            if stmt.span().start <= target_span.start && target_span.end <= stmt.span().end {
                target_stmt_index = Some(index);
                break;
            }
        }
        
        // Get next statement
        if let Some(index) = target_stmt_index {
            if index + 1 < body.len() {
                let next_stmt = &body[index + 1];
                // Find the AST node for this statement
                return ctx.nodes().iter().find(|n| n.span() == next_stmt.span());
            }
        }
        
        None
    }
}

#[test]
fn test() {
    use crate::tester::Tester;
    use serde_json::json;

    let pass = vec![
        // Standard Style (never) - correct cases
        ("var a = b", None),
        ("var a = b\nvar c = d", None),
        ("function foo() { return 'bar' }", None),
        ("const message = 'Hello'\nconsole.log(message)", None),
        
        // Required semicolons to avoid ASI
        ("var a = b\n;(function() {})()", None),
        ("var a = b\n;[1, 2, 3].forEach(fn)", None),
        ("var a = b\n;`template`", None),
        
        // Always mode - correct cases
        ("var a = b;", Some(json!(["always"]))),
        ("var a = b;\nvar c = d;", Some(json!(["always"]))),
        ("function foo() { return 'bar'; }", Some(json!(["always"]))),
    ];

    let fail = vec![
        // Standard Style (never) - unnecessary semicolons
        ("var a = b;", None),
        ("const message = 'Hello';\nconsole.log(message);", None),
        ("function foo() { return 'bar'; }", None),
        
        // Missing required semicolons for ASI
        ("var a = b\n(function() {})()", None),
        ("var a = b\n[1, 2, 3].forEach(fn)", None),
        
        // Always mode - missing semicolons
        ("var a = b", Some(json!(["always"]))),
        ("const message = 'Hello'", Some(json!(["always"]))),
    ];

    let fix = vec![
        // Remove unnecessary semicolons
        ("var a = b;", "var a = b", None),
        ("const message = 'Hello';", "const message = 'Hello'", None),
        
        // Add required semicolons
        ("var a = b\n(function() {})()", "var a = b;\n(function() {})()", None),
        ("var a = b\n[1, 2, 3].forEach(fn)", "var a = b;\n[1, 2, 3].forEach(fn)", None),
        
        // Always mode fixes
        ("var a = b", "var a = b;", Some(json!(["always"]))),
    ];

    Tester::new(Semi::NAME, Semi::PLUGIN, pass, fail)
        .expect_fix(fix)
        .test_and_snapshot();
}