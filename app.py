import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
import gradio as gr

# Load dataset
file_path = "recipe_final (1).csv"  # make sure this file is also uploaded
recipe_df = pd.read_csv(file_path)

# Preprocess
vectorizer = TfidfVectorizer()
X_ingredients = vectorizer.fit_transform(recipe_df['ingredients_list'])

scaler = StandardScaler()
X_numerical = scaler.fit_transform(recipe_df[['calories', 'fat', 'carbohydrates', 'protein', 'cholesterol', 'sodium', 'fiber']])

X_combined = np.hstack([X_numerical, X_ingredients.toarray()])

# Train KNN
knn = NearestNeighbors(n_neighbors=5, metric='cosine')
knn.fit(X_combined)

# Recommendation function
def recommend_recipes(input_features):
    input_features_scaled = scaler.transform([input_features[:7]])
    input_ingredients_transformed = vectorizer.transform([input_features[7]])
    input_combined = np.hstack([input_features_scaled, input_ingredients_transformed.toarray()])
    distances, indices = knn.kneighbors(input_combined)
    recommendations = recipe_df.iloc[indices[0]]
    return recommendations[['recipe_name', 'ingredients_list', 'image_url']]

# Gradio wrapper
def recommend_fn(calories, fat, carbs, protein, cholesterol, sodium, fiber, ingredients):
    input_features = [calories, fat, carbs, protein, cholesterol, sodium, fiber, ingredients]
    recs = recommend_recipes(input_features)
    return [(row['recipe_name'], row['image_url']) for _, row in recs.iterrows()]

iface = gr.Interface(
    fn=recommend_fn,
    inputs=[
        gr.Number(label="Calories"),
        gr.Number(label="Fat"),
        gr.Number(label="Carbohydrates"),
        gr.Number(label="Protein"),
        gr.Number(label="Cholesterol"),
        gr.Number(label="Sodium"),
        gr.Number(label="Fiber"),
        gr.Textbox(label="Ingredients")
    ],
    outputs=[gr.Gallery(label="Recommendations")],
    title="🍲 Recipe Recommender",
    description="Enter nutrients + ingredients to get personalized recipe suggestions with images."
)

iface.launch()
