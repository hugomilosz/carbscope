from groq import Groq
import os
import argparse

def estimate_carbs_in_image(image_url):
    """
    Estimate the carbohydrate content in a food image using Groq's LLM.
    
    Args:
        image_url (str): URL of the food image to analyse
        
    Returns:
        dict: The response containing carbohydrate estimation
    """
    # Initialise Groq client
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
    # Create the prompt for carbohydrate estimation
    prompt = """
    Please analyze this food image and provide:
    1. Identification of all food items visible in the image
    2. An estimate of the total carbohydrates (in grams) for each identified food item
    3. The approximate serving size you're basing the estimate on
    4. The total estimated carbohydrates for the entire meal/dish
    
    Format your response as a structured analysis with clear headings and a final total.
    If you cannot identify the food or estimate carbs with reasonable confidence, please state this clearly.
    """
    
    # Make API call to Groq
    completion = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",  # Using Llama 4 Scout model
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url
                        }
                    }
                ]
            }
        ],
        temperature=0.2,  # Lower temperature for more factual responses
        max_completion_tokens=1024,
        top_p=1,
        stream=False,
        stop=None,
    )
    
    return completion.choices[0].message

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Estimate carbohydrates in food images')
    parser.add_argument('--image_url', type=str, required=True, help='URL of the food image to analyse')
    args = parser.parse_args()
    
    # Check for API key
    if not os.environ.get("GROQ_API_KEY"):
        print("Error: GROQ_API_KEY environment variable not set")
        print("Set it using: export GROQ_API_KEY='your_api_key'")
        return
    
    try:
        # Call the function to estimate carbs
        result = estimate_carbs_in_image(args.image_url)
        
        # Print the response
        print("\n====== CARBOHYDRATE ESTIMATION RESULTS ======\n")
        print(result.content)
        print("\n============================================\n")
        
    except Exception as e:
        print(f"Error during carbohydrate estimation: {str(e)}")

if __name__ == "__main__":
    main()