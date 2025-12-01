/**
 * HOLLY'S METAMORPHOSIS - COMPLEXITY CALCULATOR
 * 
 * Calculates cyclomatic complexity for TypeScript/JavaScript code
 * using the TypeScript Compiler API.
 * 
 * Cyclomatic Complexity = Number of decision points + 1
 * 
 * Decision points include:
 * - if/else statements
 * - switch/case statements
 * - for/while/do-while loops
 * - logical operators (&&, ||)
 * - ternary operators (? :)
 * - catch clauses
 * - optional chaining (?.)
 */

import * as ts from 'typescript';

// ============================================================================
// COMPLEXITY CALCULATION
// ============================================================================

/**
 * Calculate cyclomatic complexity for a source file
 */
export function calculateFileComplexity(sourceFile: ts.SourceFile): number {
  let totalComplexity = 0;
  
  function visit(node: ts.Node) {
    totalComplexity += getNodeComplexity(node);
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return totalComplexity;
}

/**
 * Calculate cyclomatic complexity for a specific function/method
 */
export function calculateFunctionComplexity(node: ts.Node): number {
  let complexity = 1; // Base complexity
  
  function visit(innerNode: ts.Node) {
    complexity += getNodeComplexity(innerNode);
    ts.forEachChild(innerNode, visit);
  }
  
  // Don't count the function declaration itself, only its body
  if (ts.isFunctionDeclaration(node) || 
      ts.isMethodDeclaration(node) || 
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node)) {
    if (node.body) {
      visit(node.body);
    }
  } else {
    visit(node);
  }
  
  return complexity;
}

/**
 * Get complexity contribution of a single node
 */
function getNodeComplexity(node: ts.Node): number {
  switch (node.kind) {
    // Conditional statements
    case ts.SyntaxKind.IfStatement:
      return 1;
    
    case ts.SyntaxKind.ConditionalExpression: // Ternary operator
      return 1;
    
    // Switch cases
    case ts.SyntaxKind.CaseClause:
      return 1;
    
    // Loops
    case ts.SyntaxKind.ForStatement:
    case ts.SyntaxKind.ForInStatement:
    case ts.SyntaxKind.ForOfStatement:
    case ts.SyntaxKind.WhileStatement:
    case ts.SyntaxKind.DoStatement:
      return 1;
    
    // Logical operators
    case ts.SyntaxKind.BinaryExpression:
      const binaryExpr = node as ts.BinaryExpression;
      if (binaryExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          binaryExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
          binaryExpr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
        return 1;
      }
      return 0;
    
    // Exception handling
    case ts.SyntaxKind.CatchClause:
      return 1;
    
    // Optional chaining (adds decision point)
    case ts.SyntaxKind.PropertyAccessExpression:
      const propAccess = node as ts.PropertyAccessExpression;
      if (propAccess.questionDotToken) {
        return 1;
      }
      return 0;
    
    case ts.SyntaxKind.CallExpression:
      const callExpr = node as ts.CallExpression;
      if (callExpr.questionDotToken) {
        return 1;
      }
      return 0;
    
    default:
      return 0;
  }
}

// ============================================================================
// COMPLEXITY ASSESSMENT
// ============================================================================

export interface ComplexityAssessment {
  score: number;
  rating: 'simple' | 'moderate' | 'complex' | 'very-complex' | 'critical';
  recommendation: string;
}

/**
 * Assess complexity and provide human-readable rating
 */
export function assessComplexity(complexity: number): ComplexityAssessment {
  let rating: ComplexityAssessment['rating'];
  let recommendation: string;
  
  if (complexity <= 5) {
    rating = 'simple';
    recommendation = 'Low complexity - easy to understand and maintain';
  } else if (complexity <= 10) {
    rating = 'moderate';
    recommendation = 'Moderate complexity - acceptable for most code';
  } else if (complexity <= 20) {
    rating = 'complex';
    recommendation = 'High complexity - consider refactoring for better maintainability';
  } else if (complexity <= 50) {
    rating = 'very-complex';
    recommendation = 'Very high complexity - refactoring strongly recommended';
  } else {
    rating = 'critical';
    recommendation = 'Critical complexity - immediate refactoring required';
  }
  
  return {
    score: complexity,
    rating,
    recommendation,
  };
}

/**
 * Calculate average complexity for a file based on its functions
 */
export function calculateAverageComplexity(functionComplexities: number[]): number {
  if (functionComplexities.length === 0) return 0;
  
  const sum = functionComplexities.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / functionComplexities.length);
}
