"use client";

import React, { useState } from "react";

interface PersonalityWizardProps {
  onComplete: (answers: Record<number, number>) => void;
}

const QUESTIONS = [
  // A) STRUCTURE (1-6)
  {
    id: 1,
    section: "A",
    sectionName: "Structure",
    text: "I thrive when there are clear procedures and consistent ways of working.",
    reverse: false,
  },
  {
    id: 2,
    section: "A",
    sectionName: "Structure",
    text: "I feel uncomfortable when plans change at the last minute.",
    reverse: false,
  },
  {
    id: 3,
    section: "A",
    sectionName: "Structure",
    text: "I like to double-check details and ensure high accuracy.",
    reverse: false,
  },
  {
    id: 4,
    section: "A",
    sectionName: "Structure",
    text: "I don't mind switching tasks without a clear plan.",
    reverse: true,
  },
  {
    id: 5,
    section: "A",
    sectionName: "Structure",
    text: "I usually plan my day before I start working.",
    reverse: false,
  },
  {
    id: 6,
    section: "A",
    sectionName: "Structure",
    text: "Routine tasks feel comfortable and satisfying to me.",
    reverse: false,
  },

  // B) COLLABORATION (7-12)
  {
    id: 7,
    section: "B",
    sectionName: "Collaboration",
    text: "I get energy from talking and collaborating with colleagues during the day.",
    reverse: false,
  },
  {
    id: 8,
    section: "B",
    sectionName: "Collaboration",
    text: "I communicate quite directly, even if it can create disagreement.",
    reverse: false,
  },
  {
    id: 9,
    section: "B",
    sectionName: "Collaboration",
    text: "I feel drained if I need to be 'socially on' all day.",
    reverse: true,
  },
  {
    id: 10,
    section: "B",
    sectionName: "Collaboration",
    text: "I prefer solving tasks with others rather than alone.",
    reverse: false,
  },
  {
    id: 11,
    section: "B",
    sectionName: "Collaboration",
    text: "I am good at sensing how others feel and adjusting my communication style.",
    reverse: false,
  },
  {
    id: 12,
    section: "B",
    sectionName: "Collaboration",
    text: "I tend to avoid conflict and try to smooth things over instead of confronting it.",
    reverse: false,
  },

  // C) RESPONSIBILITY (13-18)
  {
    id: 13,
    section: "C",
    sectionName: "Responsibility",
    text: "I often take the lead in groups even without being the formal leader.",
    reverse: false,
  },
  {
    id: 14,
    section: "C",
    sectionName: "Responsibility",
    text: "I am motivated by having responsibility and being accountable for results.",
    reverse: false,
  },
  {
    id: 15,
    section: "C",
    sectionName: "Responsibility",
    text: "I want to influence decisions and the direction of the work.",
    reverse: false,
  },
  {
    id: 16,
    section: "C",
    sectionName: "Responsibility",
    text: "I'm fine with others making most decisions while I execute.",
    reverse: true,
  },
  {
    id: 17,
    section: "C",
    sectionName: "Responsibility",
    text: "I proactively seek new tasks and opportunities rather than waiting.",
    reverse: false,
  },
  {
    id: 18,
    section: "C",
    sectionName: "Responsibility",
    text: "I don't thrive in purely supportive roles with little influence.",
    reverse: false,
  },

  // D) CHANGE & LEARNING (19-24)
  {
    id: 19,
    section: "D",
    sectionName: "Change & Learning",
    text: "I get curious when new systems, methods, or processes are introduced.",
    reverse: false,
  },
  {
    id: 20,
    section: "D",
    sectionName: "Change & Learning",
    text: "If my role changes significantly, I see it more as an opportunity than a problem.",
    reverse: false,
  },
  {
    id: 21,
    section: "D",
    sectionName: "Change & Learning",
    text: "I thrive best when my tasks are similar from week to week.",
    reverse: true,
  },
  {
    id: 22,
    section: "D",
    sectionName: "Change & Learning",
    text: "I am willing to invest extra effort to learn something that supports my career.",
    reverse: false,
  },
  {
    id: 23,
    section: "D",
    sectionName: "Change & Learning",
    text: "I get quickly frustrated by organizational or process changes.",
    reverse: true,
  },
  {
    id: 24,
    section: "D",
    sectionName: "Change & Learning",
    text: "I learn new tools and workflows relatively quickly.",
    reverse: false,
  },

  // E) RESILIENCE (25-30)
  {
    id: 25,
    section: "E",
    sectionName: "Resilience",
    text: "I can keep overview even with many tasks and short deadlines.",
    reverse: false,
  },
  {
    id: 26,
    section: "E",
    sectionName: "Resilience",
    text: 'I can mentally "switch off" from work when I\'m off.',
    reverse: false,
  },
  {
    id: 27,
    section: "E",
    sectionName: "Resilience",
    text: "Criticism or disagreement stays in my mind for a long time afterward.",
    reverse: true,
  },
  {
    id: 28,
    section: "E",
    sectionName: "Resilience",
    text: "When others feel pressured, I can stay calm and create structure.",
    reverse: false,
  },
  {
    id: 29,
    section: "E",
    sectionName: "Resilience",
    text: "Workplace conflicts affect my wellbeing a lot.",
    reverse: true,
  },
  {
    id: 30,
    section: "E",
    sectionName: "Resilience",
    text: "I can handle high-pressure periods if they are temporary and meaningful.",
    reverse: false,
  },

  // F) MOTIVATION (31-36)
  {
    id: 31,
    section: "F",
    sectionName: "Motivation",
    text: "Job security and stable frameworks matter more to me than fast career growth.",
    reverse: false,
  },
  {
    id: 32,
    section: "F",
    sectionName: "Motivation",
    text: "Meaning and purpose matter more than the highest salary.",
    reverse: false,
  },
  {
    id: 33,
    section: "F",
    sectionName: "Motivation",
    text: "Flexibility (time/place/way of working) is one of the most important things in a job.",
    reverse: false,
  },
  {
    id: 34,
    section: "F",
    sectionName: "Motivation",
    text: "I'm motivated by clear goals and visible results.",
    reverse: false,
  },
  {
    id: 35,
    section: "F",
    sectionName: "Motivation",
    text: "Social community and relationships at work are very important to me.",
    reverse: false,
  },
  {
    id: 36,
    section: "F",
    sectionName: "Motivation",
    text: "I want to develop professionally and personally, even if it challenges me.",
    reverse: false,
  },
];

const SECTIONS = [
  { id: "A", name: "Structure", qStart: 1, qEnd: 6 },
  { id: "B", name: "Collaboration", qStart: 7, qEnd: 12 },
  { id: "C", name: "Responsibility", qStart: 13, qEnd: 18 },
  { id: "D", name: "Change & Learning", qStart: 19, qEnd: 24 },
  { id: "E", name: "Resilience", qStart: 25, qEnd: 30 },
  { id: "F", name: "Motivation", qStart: 31, qEnd: 36 },
];

export default function PersonalityWizard({ onComplete }: PersonalityWizardProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isShowingFreeText, setIsShowingFreeText] = useState(false);

  const section = SECTIONS[currentSection];
  const sectionQuestions = QUESTIONS.filter(
    (q) => q.id >= section.qStart && q.id <= section.qEnd
  );

  const allLikertAnswered =
    Object.keys(answers).length >= 36 &&
    QUESTIONS.every((q) => answers[q.id] !== undefined);

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleNext = () => {
    // Check all questions in current section are answered
    const sectionAnswered = sectionQuestions.every((q) => answers[q.id] !== undefined);
    if (!sectionAnswered) {
      alert("Please answer all questions in this section before proceeding.");
      return;
    }

    if (currentSection < SECTIONS.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      setIsShowingFreeText(true);
    }
  };

  const handlePrev = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleCompleteWizard = () => {
    onComplete(answers);
  };

  return (
    <div style={{ marginTop: "40px", borderTop: "2px solid #ddd", paddingTop: "30px" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "10px" }}>
        Personality & Work-Style Profile
      </h2>
      <p style={{ color: "#666", marginBottom: "30px" }}>
        Answer a short questionnaire to understand your personality and work preferences.
        This will be combined with your CV for a complete profile.
      </p>

      {!isShowingFreeText && (
        <div>
          {/* Progress indicator */}
          <div style={{ marginBottom: "30px" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
              {SECTIONS.map((s, idx) => (
                <div
                  key={s.id}
                  style={{
                    flex: 1,
                    height: "4px",
                    backgroundColor: idx <= currentSection ? "#0070f3" : "#ddd",
                    borderRadius: "2px",
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
              Section {currentSection + 1} of {SECTIONS.length}: <strong>{section.name}</strong> •
              Question {section.qStart} of 36
            </p>
          </div>

          {/* Questions */}
          <div style={{ marginBottom: "30px" }}>
            {sectionQuestions.map((question) => (
              <div
                key={question.id}
                style={{
                  marginBottom: "30px",
                  paddingBottom: "20px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <p style={{ marginBottom: "15px", fontSize: "15px", fontWeight: "500" }}>
                  {question.id}. {question.text}
                  {question.reverse && (
                    <span style={{ fontSize: "12px", color: "#999", marginLeft: "8px" }}>
                      (reverse)
                    </span>
                  )}
                </p>

                {/* Likert scale buttons */}
                <div style={{ display: "flex", gap: "10px", justifyContent: "space-between" }}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => handleAnswer(question.id, value)}
                      style={{
                        flex: 1,
                        padding: "12px 8px",
                        border: answers[question.id] === value ? "2px solid #0070f3" : "1px solid #ddd",
                        backgroundColor:
                          answers[question.id] === value ? "#e3f2fd" : "#f9f9f9",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: answers[question.id] === value ? "600" : "500",
                        color: answers[question.id] === value ? "#0070f3" : "#333",
                        fontSize: "13px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ fontSize: "16px", fontWeight: "bold" }}>{value}</div>
                      <div style={{ fontSize: "11px", marginTop: "4px" }}>
                        {value === 1 && "Strongly\ndisagree"}
                        {value === 2 && "Disagree"}
                        {value === 3 && "Neutral"}
                        {value === 4 && "Agree"}
                        {value === 5 && "Strongly\nagree"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Navigation buttons */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "space-between" }}>
            <button
              onClick={handlePrev}
              disabled={currentSection === 0}
              style={{
                padding: "12px 24px",
                backgroundColor: currentSection === 0 ? "#ccc" : "#f0f0f0",
                color: currentSection === 0 ? "#999" : "#333",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: currentSection === 0 ? "not-allowed" : "pointer",
                fontWeight: "500",
                fontSize: "16px",
              }}
            >
              ← Previous
            </button>

            <button
              onClick={handleNext}
              style={{
                padding: "12px 24px",
                backgroundColor: "#0070f3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "16px",
              }}
            >
              {currentSection === SECTIONS.length - 1 ? "Next (Free Text) →" : "Next →"}
            </button>
          </div>
        </div>
      )}

      {isShowingFreeText && (
        <FreeTextQuestions
          answers={answers}
          onComplete={handleCompleteWizard}
          onBack={() => setIsShowingFreeText(false)}
        />
      )}
    </div>
  );
}

interface FreeTextQuestionsProps {
  answers: Record<number, number>;
  onComplete: () => void;
  onBack: () => void;
}

function FreeTextQuestions({ answers, onComplete, onBack }: FreeTextQuestionsProps) {
  const [freeText, setFreeText] = useState<Record<string, string>>({
    ft1: "",
    ft2: "",
    ft3: "",
    ft4: "",
    ft5: "",
    ft6: "",
    ft7: "",
    ft8: "",
  });

  const questions = [
    { id: "ft1", text: "What gives you the most energy at work (be specific)?" },
    { id: "ft2", text: "What drains you the most at work (be specific)?" },
    { id: "ft3", text: "Describe a work environment where you thrive best." },
    { id: "ft4", text: "Describe a work environment you prefer to avoid, and why." },
    { id: "ft5", text: "What would colleagues say are your biggest strengths?" },
    { id: "ft6", text: "What feedback have you received that you want to improve?" },
    {
      id: "ft7",
      text: "What matters most in your next job (pick 2–3 priorities and explain briefly)?",
    },
    { id: "ft8", text: "If you could choose freely: what tasks do you want more of, and less of?" },
  ];

  const handleTextChange = (id: string, value: string) => {
    setFreeText((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = () => {
    // Store free text answers in the answers object (with keys like "ft1", "ft2", etc.)
    const finalAnswers = { ...answers };
    Object.entries(freeText).forEach(([key, value]) => {
      (finalAnswers as any)[key] = value;
    });
    onComplete();
  };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
          Free-text section (optional but encouraged) – These help us understand the nuance of your work style.
        </p>
      </div>

      {questions.map((q, idx) => (
        <div key={q.id} style={{ marginBottom: "25px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "500",
              fontSize: "15px",
            }}
          >
            {idx + 1}. {q.text}
          </label>
          <textarea
            value={freeText[q.id]}
            onChange={(e) => handleTextChange(q.id, e.target.value)}
            placeholder="Your answer (optional)..."
            rows={3}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontFamily: "inherit",
              fontSize: "14px",
              lineHeight: "1.5",
              resize: "vertical",
            }}
          />
        </div>
      ))}

      {/* Navigation buttons */}
      <div style={{ display: "flex", gap: "12px", justifyContent: "space-between" }}>
        <button
          onClick={onBack}
          style={{
            padding: "12px 24px",
            backgroundColor: "#f0f0f0",
            color: "#333",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "500",
            fontSize: "16px",
          }}
        >
          ← Back
        </button>

        <button
          onClick={handleSubmit}
          style={{
            padding: "12px 24px",
            backgroundColor: "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "500",
            fontSize: "16px",
          }}
        >
          Complete Profile
        </button>
      </div>
    </div>
  );
}
