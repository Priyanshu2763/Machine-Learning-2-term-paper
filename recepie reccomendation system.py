import pandas as pd

# Load the dataset
file_path = 'recipe_final (1).csv'
recipe_df = pd.read_csv(file_path)

recipe_df.head()
recipe_df.isnull().sum()
recipe_df['ingredients_list'][0]
import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
# Preprocess Ingredients
vectorizer = TfidfVectorizer()
X_ingredients = vectorizer.fit_transform(recipe_df['ingredients_list'])
X_ingredients
# Normalize Numerical Features
scaler = StandardScaler()
X_numerical = scaler.fit_transform(recipe_df[['calories', 'fat', 'carbohydrates', 'protein', 'cholesterol', 'sodium', 'fiber']])
X_numerical
# Combine Features
X_combined = np.hstack([X_numerical, X_ingredients.toarray()])
X_combined
# Train KNN Model
knn = NearestNeighbors(n_neighbors=5, metric='cosine')
knn.fit(X_combined)
# Function to Recommend Recipes
def recommend_recipes(input_features):
    input_features_scaled = scaler.transform([input_features[:7]])
    input_ingredients_transformed = vectorizer.transform([input_features[7]])
    input_combined = np.hstack([input_features_scaled, input_ingredients_transformed.toarray()])
    distances, indices = knn.kneighbors(input_combined)
    recommendations = recipe_df.iloc[indices[0]]
    return recommendations[['recipe_name', 'ingredients_list', 'image_url']]
from IPython.display import display, HTML, Image

# Function to display recipes with images
def display_recommendations(recommendations):
    for index, row in recommendations.iterrows():
        recipe_name = row['recipe_name']
        image_url = row['image_url']
        # Display the recipe name and image
        display(HTML(f"<h4>{recipe_name}</h4>"))
        display(Image(url=image_url, width=200))  # Adjust width as needed
        print("\n")  # Print a new line for spacing
# Example Input
input_features = [15, 36, 1, 42, 21, 81, 2, 'pork belly, smoked paprika, kosher salt']
recommendations = recommend_recipes(input_features)
# Display the recommendations with images
display_recommendations(recommendations)