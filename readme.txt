Recipe Recommendation System
This project is a Recipe Recommendation System using K-Nearest Neighbors (KNN) to suggest recipes based on ingredients and nutritional values. The system utilizes a combination of text processing (ingredients) and numerical features (nutritional data) to find similar recipes. The project leverages TF-IDF Vectorization for ingredients and Standard Scaling for normalizing numerical features like calories, fat, carbohydrates, etc.

Features
Data Preprocessing:

The ingredient list is vectorized using TF-IDF, which helps in processing the text data for similarity computation.
Numerical data (calories, fat, carbohydrates, protein, cholesterol, sodium, fiber) is normalized using StandardScaler.
Combined numerical and ingredient data to form a unified feature set.
Recipe Recommendation:

A K-Nearest Neighbors (KNN) model is used to identify the top 5 most similar recipes based on combined features.
The similarity is computed using cosine distance to compare the recipes.
Visualization:

Recommended recipes are displayed with their names and associated images using IPython display utilities.
Code Overview
Loading and Preprocessing Data
Load the dataset from a CSV file using pandas.
Preprocess the ingredients using TfidfVectorizer.
Normalize the numerical features like calories, fat, and other nutritional data with StandardScaler.
Combine the numerical and vectorized text data into a single feature set for each recipe.
Model Training
A KNN model is trained using the preprocessed data with n_neighbors=5 and metric='cosine'.
Recipe Recommendation
A custom function, recommend_recipes, takes user input including nutritional values and ingredients, and recommends similar recipes.
Display the recommended recipes with their names and images using the display_recommendations function.
How to Use
Clone the repository.
Load your own dataset or use the provided example dataset (recipe_final.csv).
Install the required dependencies: pandas, numpy, scikit-learn, IPython.
Modify the input features (input_features) as needed to get personalized recipe recommendations.
Run the script and visualize the recommended recipes.
Dependencies
pandas
numpy
scikit-learn
IPython
Example
Below is an example of how to use the recommendation function:

# Example input features
input_features = [15, 36, 1, 42, 21, 81, 2, 'pork belly, smoked paprika, kosher salt']

# Get recommendations
recommendations = recommend_recipes(input_features)

# Display the recommendations with images
display_recommendations(recommendations)
Dataset
The dataset (recipe_final.csv) should include:
Nutritional Information: calories, fat, carbohydrates, protein, cholesterol, sodium, fiber.
Ingredients List: A list of ingredients used in the recipe.
Image URLs: URLs pointing to images of the dishes.
Contributing
Feel free to open issues or create pull requests for improvements, bug fixes, or additional features.

License
This project is open-source and available under the MIT License.