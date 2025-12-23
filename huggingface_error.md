# HuggingFace API Error

## Error Message:
```
[Chat API] Stream error: Error: https://api-inference.huggingface.co is no longer supported. 
Please use https://router.huggingface.co instead.
```

## Root Cause:
The HuggingFace Inference library is still using the **OLD deprecated endpoint** (`api-inference.huggingface.co`) instead of the new one (`router.huggingface.co`).

## Status Code:
**405 Method Not Allowed** (from HuggingFace, not from our API)

## Solution:
Need to update the HuggingFace API call to explicitly use the new endpoint URL.

The `@huggingface/inference` library might be outdated or needs explicit configuration to use the new endpoint.

## Options:
1. Update the `@huggingface/inference` package to the latest version
2. Manually specify the endpoint URL in the API call
3. Use direct fetch() calls to the HuggingFace API instead of the SDK
