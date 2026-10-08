
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Loader2, CheckCircle, AlertTriangle, XCircle, ExternalLink, Wand2 } from "lucide-react";

export default function FactCheckPanel({ article, compact = false, onRegenerateRequest = null }) {
  const [isChecking, setIsChecking] = useState(false);
  const [factCheckResult, setFactCheckResult] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleFactCheck = async () => {
    setIsChecking(true);
    setShowResults(true);
    setFactCheckResult(null); // Clear previous results
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional fact-checker. Analyze the following article for factual accuracy by searching the web for verification.

Article Title: ${article.title}
Article Category: ${article.category}
Article Content: ${article.body?.replace(/<[^>]*>/g, ' ').substring(0, 4000)}

Perform a comprehensive fact-check by:
1. Identifying key factual claims in the article
2. Searching for credible sources to verify each claim
3. Rating the overall accuracy of the article
4. Providing specific evidence and sources for your assessment

Return a JSON with:
- overall_rating: "verified", "mostly_accurate", "mixed", "mostly_false", or "false"
- confidence_score: number between 0-100
- summary: brief overall assessment (2-3 sentences)
- claims: array of objects with:
  - claim: the specific claim being checked
  - verdict: "true", "mostly_true", "unverifiable", "mostly_false", or "false"
  - evidence: explanation with sources
  - sources: array of credible source URLs

Be thorough and objective. Base verdicts on verifiable facts from credible sources.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            overall_rating: { 
              type: "string",
              enum: ["verified", "mostly_accurate", "mixed", "mostly_false", "false"]
            },
            confidence_score: { type: "number" },
            summary: { type: "string" },
            claims: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  claim: { type: "string" },
                  verdict: { type: "string" },
                  evidence: { type: "string" },
                  sources: { 
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            }
          }
        }
      });

      setFactCheckResult(result);
    } catch (error) {
      console.error("Fact-check error:", error);
      setFactCheckResult({
        overall_rating: "error",
        summary: "Unable to complete fact-check. Please try again.",
        claims: []
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getRatingIcon = (rating) => {
    switch (rating) {
      case "verified":
        return <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />;
      case "mostly_accurate":
        return <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
      case "mixed":
        return <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />;
      case "mostly_false":
        return <XCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />;
      case "false":
        return <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />;
      default:
        return <Shield className="w-6 h-6 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case "verified":
        return "bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700";
      case "mostly_accurate":
        return "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700";
      case "mixed":
        return "bg-yellow-50 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-700";
      case "mostly_false":
        return "bg-orange-50 dark:bg-orange-950 border-orange-300 dark:border-orange-700";
      case "false":
        return "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700";
      default:
        return "bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700";
    }
  };

  const getRatingTextColor = (rating) => {
    switch (rating) {
      case "verified":
        return "text-green-900 dark:text-green-100";
      case "mostly_accurate":
        return "text-blue-900 dark:text-blue-100";
      case "mixed":
        return "text-yellow-900 dark:text-yellow-100";
      case "mostly_false":
        return "text-orange-900 dark:text-orange-100";
      case "false":
        return "text-red-900 dark:text-red-100";
      default:
        return "text-gray-900 dark:text-gray-100";
    }
  };

  const getVerdictColor = (verdict) => {
    if (verdict?.includes("true")) return "text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30";
    if (verdict?.includes("false")) return "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30";
    return "text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30";
  };

  const handleRegenerateArticle = async () => {
    if (!onRegenerateRequest || !factCheckResult) return;

    setIsRegenerating(true);
    try {
      // Build a detailed correction prompt based on fact-check results
      const issuesClaims = factCheckResult.claims
        ?.filter(c => c.verdict !== "true")
        .map(c => `- Claim: "${c.claim}"\n  Issue: ${c.verdict}\n  Correction needed: ${c.evidence}`)
        .join("\n\n");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional editor and fact-checker. Rewrite the following article to correct factual inaccuracies identified in a fact-check analysis.

Article Title: ${article.title}
Article Category: ${article.category}
Original Article Content: ${article.body?.replace(/<[^>]*>/g, ' ')}

FACT-CHECK RESULTS:
Overall Rating: ${factCheckResult.overall_rating}
Summary: ${factCheckResult.summary}

SPECIFIC ISSUES TO ADDRESS:
${issuesClaims || "General accuracy improvements needed"}

GUIDELINES FOR CORRECTION:
1. Maintain the article's voice, tone, and overall structure
2. Correct ONLY the factual inaccuracies identified in the fact-check
3. Replace false or misleading claims with accurate information
4. Add proper attribution and sourcing where needed
5. Keep the writing style professional and engaging
6. Preserve the article's core message while ensuring accuracy
7. Return the content in clean HTML format with <p> tags
8. CRITICAL: After EVERY closing </p> tag, add an empty paragraph <p></p> for spacing
9. Do NOT add disclaimers or meta-commentary about the corrections

Return ONLY the corrected HTML content with proper spacing.`,
        response_json_schema: {
          type: "object",
          properties: {
            corrected_content: { type: "string" }
          }
        }
      });

      // Pass the corrected content to the parent component
      onRegenerateRequest(result.corrected_content, factCheckResult);
    } catch (error) {
      console.error("Error regenerating article:", error);
      alert("Error regenerating article. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const shouldShowRegenerate = onRegenerateRequest && 
    factCheckResult && 
    factCheckResult.overall_rating !== "verified" && 
    factCheckResult.overall_rating !== "error";

  // Helper function to safely parse URLs and extract hostname
  const getSourceHostname = (source) => {
    try {
      // Add protocol if missing
      const urlString = source.startsWith('http') ? source : `https://${source}`;
      const url = new URL(urlString);
      return url.hostname;
    } catch (error) {
      // If URL parsing fails, return the source as-is (truncated)
      return source.length > 50 ? source.substring(0, 50) + '...' : source;
    }
  };

  // Helper function to get valid href for links
  const getValidHref = (source) => {
    try {
      // Add protocol if missing
      if (source.startsWith('http')) {
        return source;
      }
      return `https://${source}`;
    } catch (error) {
      // If URL parsing fails, return the original source, browser might handle it.
      // Or if it's truly unparsable, it won't be a valid link anyway.
      return source;
    }
  };

  if (compact) {
    return (
      <Button
        onClick={handleFactCheck}
        disabled={isChecking}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {isChecking ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4" />
            Fact Check
          </>
        )}
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      {!showResults ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                AI-Powered Fact Check
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Our AI will analyze this article's factual claims by searching credible sources across the web
                and provide a detailed verification report with evidence and source links.
              </p>
            </div>
          </div>
          <Button
            onClick={handleFactCheck}
            disabled={isChecking}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing Article...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Start Fact Check
              </>
            )}
          </Button>
        </div>
      ) : isChecking ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Analyzing Article...
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                Our AI is searching credible sources across the web to verify the claims in this article. 
                This may take 15-30 seconds.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span>Checking facts</span>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-75"></div>
              <span>Verifying sources</span>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
        </div>
      ) : factCheckResult ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Fact Check Results
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Analysis completed • {factCheckResult.claims?.length || 0} claims verified
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Overall Rating */}
            <Alert className={`${getRatingColor(factCheckResult.overall_rating)} border-2`}>
              <div className="flex items-start gap-4">
                {getRatingIcon(factCheckResult.overall_rating)}
                <div className="flex-1">
                  <h4 className={`text-lg font-bold mb-2 capitalize ${getRatingTextColor(factCheckResult.overall_rating)}`}>
                    {factCheckResult.overall_rating?.replace("_", " ")}
                    {factCheckResult.confidence_score && (
                      <span className="text-sm font-normal ml-3">
                        (Confidence: {factCheckResult.confidence_score}%)
                      </span>
                    )}
                  </h4>
                  <AlertDescription className={`text-sm leading-relaxed ${getRatingTextColor(factCheckResult.overall_rating)}`}>
                    {factCheckResult.summary}
                  </AlertDescription>
                </div>
              </div>
            </Alert>

            {/* Regenerate Article Option */}
            {shouldShowRegenerate && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <Wand2 className="w-5 h-5 text-amber-700 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Accuracy Issues Detected
                    </h4>
                    <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                      The fact-check found some inaccuracies. You can automatically fix these issues using AI to rewrite 
                      the affected parts while maintaining your article's voice and message.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleRegenerateArticle}
                  disabled={isRegenerating}
                  className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Fixing Article...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Fix Article Based on Fact-Check
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Individual Claims */}
            {factCheckResult.claims && factCheckResult.claims.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Detailed Analysis
                  </h4>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {factCheckResult.claims.length} {factCheckResult.claims.length === 1 ? 'claim' : 'claims'} checked
                  </span>
                </div>
                
                {factCheckResult.claims.map((claim, index) => (
                  <div
                    key={index}
                    className="p-5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                          {claim.claim}
                        </p>
                      </div>
                    </div>

                    <div className="pl-11">
                      <div className="inline-flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                          Verdict:
                        </span>
                        <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${getVerdictColor(claim.verdict)}`}>
                          {claim.verdict?.replace("_", " ")}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3 bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                        {claim.evidence}
                      </p>
                      
                      {claim.sources && claim.sources.length > 0 && (
                        <div className="bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Sources ({claim.sources.length}):
                          </p>
                          <div className="space-y-1.5">
                            {claim.sources.map((source, idx) => (
                              <a
                                key={idx}
                                href={getValidHref(source)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline group"
                              >
                                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="truncate">{getSourceHostname(source)}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Fact-check powered by AI • Sources verified from credible websites
              </p>
              <Button
                onClick={() => {
                  setShowResults(false);
                  setFactCheckResult(null);
                }}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Shield className="w-4 h-4" />
                Run New Check
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
