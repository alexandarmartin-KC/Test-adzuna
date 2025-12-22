#!/bin/bash

# Test script for job match analysis endpoint

echo "=== Testing Job Match Analysis API ==="
echo ""

# Test 1: Valid request
echo "Test 1: Valid job match request"
curl -X POST http://localhost:3000/api/career-advisor/match-job \
  -H "Content-Type: application/json" \
  -d '{
    "cv_profile": {
      "hard_skills": ["JavaScript", "React", "Node.js", "TypeScript", "SQL"],
      "soft_skills": ["Problem solving", "Communication", "Team collaboration"],
      "summary": "Experienced full-stack developer with 5 years of experience building web applications.",
      "career_progression_same_track": "Senior Full-Stack Developer",
      "career_progression_new_track": "DevOps Engineer"
    },
    "job_description": "We are looking for a Senior Frontend Developer with strong React and TypeScript skills. The ideal candidate will have experience with modern web development practices and excellent communication skills. Requirements: 5+ years React, TypeScript, REST APIs, Git, Agile methodologies."
  }' | jq '.'

echo ""
echo ""

# Test 2: Missing cv_profile
echo "Test 2: Missing cv_profile (should fail)"
curl -X POST http://localhost:3000/api/career-advisor/match-job \
  -H "Content-Type: application/json" \
  -d '{
    "job_description": "Test job description"
  }' | jq '.'

echo ""
echo ""

# Test 3: Missing job_description
echo "Test 3: Missing job_description (should fail)"
curl -X POST http://localhost:3000/api/career-advisor/match-job \
  -H "Content-Type: application/json" \
  -d '{
    "cv_profile": {
      "hard_skills": ["JavaScript"],
      "soft_skills": ["Communication"],
      "summary": "Developer"
    }
  }' | jq '.'

echo ""
echo "=== Tests Complete ==="
