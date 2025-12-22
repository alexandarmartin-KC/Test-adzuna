#!/bin/bash

# Firecrawl Feature Test Script
# This script tests the Firecrawl API endpoints

BASE_URL="http://localhost:3000"

echo "==================================="
echo "Firecrawl API Test Script"
echo "==================================="
echo ""

# Test 1: Fetch all jobs (initial crawl)
echo "Test 1: Fetching all jobs (this will trigger the initial crawl)..."
curl -s "$BASE_URL/api/firecrawl/jobs" | jq '.'
echo ""
echo "-----------------------------------"
echo ""

# Test 2: Filter by company - Orsted
echo "Test 2: Filtering by company - Orsted..."
curl -s "$BASE_URL/api/firecrawl/jobs?company=orsted" | jq '.jobs | length'
echo " Orsted jobs found"
echo ""

# Test 3: Filter by company - Canon
echo "Test 3: Filtering by company - Canon..."
curl -s "$BASE_URL/api/firecrawl/jobs?company=canon" | jq '.jobs | length'
echo " Canon jobs found"
echo ""

# Test 4: Filter by country - Denmark
echo "Test 4: Filtering by country - Denmark (DK)..."
curl -s "$BASE_URL/api/firecrawl/jobs?country=dk" | jq '.jobs | length'
echo " jobs in Denmark found"
echo ""

# Test 5: Filter by country - Sweden
echo "Test 5: Filtering by country - Sweden (SE)..."
curl -s "$BASE_URL/api/firecrawl/jobs?country=se" | jq '.jobs | length'
echo " jobs in Sweden found"
echo ""

# Test 6: Filter by country - Norway
echo "Test 6: Filtering by country - Norway (NO)..."
curl -s "$BASE_URL/api/firecrawl/jobs?country=no" | jq '.jobs | length'
echo " jobs in Norway found"
echo ""

# Test 7: Text search
echo "Test 7: Searching for 'engineer'..."
curl -s "$BASE_URL/api/firecrawl/jobs?q=engineer" | jq '.jobs | length'
echo " jobs matching 'engineer' found"
echo ""

# Test 8: Combined filters
echo "Test 8: Combined filters - Orsted + Denmark + 'energy'..."
curl -s "$BASE_URL/api/firecrawl/jobs?company=orsted&country=dk&q=energy" | jq '.jobs | length'
echo " jobs found"
echo ""

# Test 9: Check cache status
echo "Test 9: Checking cache status..."
curl -s "$BASE_URL/api/firecrawl/jobs" | jq '{cached: .cached, total: .total, timestamp: .cacheTimestamp}'
echo ""

echo "==================================="
echo "Tests completed!"
echo "==================================="
echo ""
echo "To test the frontend:"
echo "  1. Open your browser"
echo "  2. Navigate to http://localhost:3000/firecrawl"
echo "  3. Use the filters and click 'Fetch Jobs'"
echo ""
echo "To force a recrawl:"
echo "  curl '$BASE_URL/api/firecrawl/jobs?recrawl=true'"
echo ""
