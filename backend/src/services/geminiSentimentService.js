import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service for analyzing driver sentiment using Google's Gemini 2.5 Flash Lite
 */
class GeminiSentimentService {
  constructor() {
    const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
    
    if (!apiKey) {
      throw new Error('GOOGLE_AI_STUDIO_API_KEY environment variable is not set');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  }

  /**
   * Analyze driver survey data and return sentiment analysis
   * @param {Object} surveyData - Driver survey responses
   * @returns {Object} Sentiment analysis result
   */
  async analyzeSentiment(surveyData) {
    try {
      const prompt = this.buildPrompt(surveyData);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON response from Gemini
      let analysis;
      try {
        // Extract JSON from response (remove any markdown formatting)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback parsing if no proper JSON structure
          analysis = JSON.parse(text);
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', text);
        throw new Error('Failed to parse sentiment analysis response');
      }
      
      // Validate response structure
      if (!this.validateResponse(analysis)) {
        throw new Error('Invalid response structure from Gemini');
      }
      
      return {
        sentimentScore: Math.min(Math.max(analysis.sentimentScore, 0), 100),
        sentimentLabel: analysis.sentimentLabel,
        analysis: analysis.analysis,
        recommendations: analysis.recommendations || [],
        processedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error in Gemini sentiment analysis:', error);
      throw new Error(`Sentiment analysis failed: ${error.message}`);
    }
  }

  /**
   * Build the prompt for Gemini analysis
   * @param {Object} surveyData - Driver survey responses
   * @returns {string} Formatted prompt
   */
  buildPrompt(surveyData) {
    return `
Analyze the following driver survey data and provide a comprehensive sentiment analysis for fleet management purposes:

Driver Survey Data:
- Job Satisfaction: ${surveyData.jobSatisfaction || 'Not provided'}
- Relationship with Management: ${surveyData.relationshipWithManagement || 'Not provided'}
- Work Hours per Week: ${surveyData.workHours || 'Not provided'}
- Mental Health Status: ${surveyData.mentalHealth || 'Not provided'}
- Physical Health Status: ${surveyData.physicalHealth || 'Not provided'}
- Salary Satisfaction: ${surveyData.salarySatisfaction || 'Not provided'}
- Work Conditions: ${surveyData.workConditions || 'Not provided'}

Please provide a detailed analysis with the following components:

1. A sentiment score from 0-100 where:
   - 0-20: Very Negative (critical intervention needed)
   - 21-40: Negative (significant concerns)
   - 41-60: Neutral (mixed feelings)
   - 61-80: Positive (generally satisfied)
   - 81-100: Very Positive (highly satisfied)

2. A sentiment label that categorizes the overall mood: "Very Negative", "Negative", "Neutral", "Positive", or "Very Positive"

3. A comprehensive analysis (2-3 sentences) explaining the driver's overall sentiment and key factors affecting their well-being

4. 3-5 specific, actionable recommendations for fleet management to improve driver satisfaction and well-being

Return your response in this exact JSON format:
{
  "sentimentScore": [number between 0-100],
  "sentimentLabel": "[sentiment category]",
  "analysis": "[comprehensive analysis text]",
  "recommendations": [
    "[recommendation 1]",
    "[recommendation 2]",
    "[recommendation 3]",
    "[recommendation 4]",
    "[recommendation 5]"
  ]
}

Ensure the response is valid JSON without any markdown formatting or additional text.
    `.trim();
  }

  /**
   * Validate the response structure from Gemini
   * @param {Object} response - Parsed response from Gemini
   * @returns {boolean} Whether the response is valid
   */
  validateResponse(response) {
    return (
      response &&
      typeof response.sentimentScore === 'number' &&
      response.sentimentScore >= 0 &&
      response.sentimentScore <= 100 &&
      typeof response.sentimentLabel === 'string' &&
      typeof response.analysis === 'string' &&
      Array.isArray(response.recommendations) &&
      response.recommendations.length > 0
    );
  }

  /**
   * Get a fallback sentiment analysis in case of API failure
   * @param {Object} surveyData - Driver survey responses
   * @returns {Object} Basic sentiment analysis
   */
  getFallbackAnalysis(surveyData) {
    // Simple rule-based fallback
    let score = 50; // Start neutral
    
    // Adjust based on responses
    const positiveResponses = ['Excellent', 'Very High', 'High', 'Good', 'Very Satisfied', 'Satisfied'];
    const negativeResponses = ['Poor', 'Very Low', 'Low', 'Terrible', 'Very Dissatisfied', 'Dissatisfied'];
    
    Object.values(surveyData).forEach(response => {
      if (positiveResponses.includes(response)) score += 10;
      if (negativeResponses.includes(response)) score -= 10;
    });
    
    score = Math.min(Math.max(score, 0), 100);
    
    let label = 'Neutral';
    if (score >= 81) label = 'Very Positive';
    else if (score >= 61) label = 'Positive';
    else if (score <= 20) label = 'Very Negative';
    else if (score <= 40) label = 'Negative';
    
    return {
      sentimentScore: score,
      sentimentLabel: label,
      analysis: 'Basic sentiment analysis based on survey responses. Please note: This is a fallback analysis due to AI service unavailability.',
      recommendations: [
        'Review driver working conditions',
        'Consider driver feedback sessions',
        'Evaluate compensation and benefits',
        'Implement driver wellness programs'
      ],
      processedAt: new Date().toISOString()
    };
  }
}

export default GeminiSentimentService;