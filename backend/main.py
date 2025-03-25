import matplotlib
matplotlib.use('Agg')  # Use 'Agg' backend for non-GUI rendering

import matplotlib.pyplot as plt
from flask import Flask, request, jsonify, send_from_directory, send_file
import os
import re
from indicnlp.tokenize.sentence_tokenize import sentence_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from langdetect import detect
from flask_cors import CORS  # To handle CORS for frontend-backend communication
from libretranslatepy import LibreTranslateAPI  # Import LibreTranslate API

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Directory to store uploaded files and processed results
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

GRAPH_FOLDER = "static/graphs"
os.makedirs(GRAPH_FOLDER, exist_ok=True)

translator = LibreTranslateAPI("http://localhost:3000")

# Paths to stopwords files
marathi_stopwords_file_path = 'stopwords_marathi.txt'
english_stopwords_file_path = 'stopwords_english.txt'

# Load stopwords for Marathi and English
def load_stopwords(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        stopwords = set(line.strip() for line in file)
    return stopwords

marathi_stopwords = load_stopwords(marathi_stopwords_file_path)
english_stopwords = load_stopwords(english_stopwords_file_path)

# Function to detect language of the text
def detect_language(text):
    try:
        return detect(text)
    except:
        return 'unknown'

# Function to translate Marathi text to English
def translate_marathi_to_english(text):
    try:
        translated_text = translator.translate(text, source="mr", target="en")
        return translated_text
    except Exception as e:
        print(f"Translation failed: {e}")
        return text  # Return original text if translation fails

# Preprocess text based on language
def preprocess_text(text, lang):
    if lang == 'mr':
        # Translate Marathi text to English
        text = translate_marathi_to_english(text)
        lang = 'en'  # Set language to English after translation

    if lang == 'mr':
        sentences = sentence_split(text, lang='mr')
        stop_words = marathi_stopwords
    elif lang == 'en':
        sentences = re.split(r'(?<=[.!?])\s+', text)
        stop_words = english_stopwords
    else:
        return text

    preprocessed_sentences = []
    for sentence in sentences:
        sentence = re.sub(r'[^\w\s]', '', sentence)
        words = sentence.split()
        filtered_words = [word for word in words if word not in stop_words]
        preprocessed_sentence = ' '.join(filtered_words)
        preprocessed_sentences.append(preprocessed_sentence)

    return ' '.join(preprocessed_sentences)

# Function to find optimal number of clusters
def find_optimal_clusters(data, max_clusters=10):
    distortions = []
    silhouette_scores = []
    K = range(2, min(max_clusters + 1, data.shape[0]))

    for k in K:
        kmeans = KMeans(n_clusters=k, n_init=10, random_state=42)
        kmeans.fit(data)
        distortions.append(kmeans.inertia_)

        labels = kmeans.labels_
        if len(set(labels)) > 1:
            silhouette_avg = silhouette_score(data, labels)
            silhouette_scores.append(silhouette_avg)
        else:
            silhouette_scores.append(-1)

    # Plot Elbow Method
    elbow_image_path = os.path.join(GRAPH_FOLDER, 'elbow_method.png')
    plt.figure(figsize=(8, 6))
    plt.plot(K, distortions, marker='o')
    plt.xlabel('Number of clusters')
    plt.ylabel('Distortion')
    plt.title('Elbow Method')
    plt.grid(True)
    plt.savefig(elbow_image_path)
    plt.close()

    # Plot Silhouette Scores
    silhouette_image_path = os.path.join(GRAPH_FOLDER, 'silhouette_method.png')
    plt.figure(figsize=(8, 6))
    plt.plot(K, silhouette_scores, marker='x', color='orange')
    plt.xlabel('Number of clusters')
    plt.ylabel('Silhouette Score')
    plt.title('Silhouette Score Method')
    plt.grid(True)
    plt.savefig(silhouette_image_path)
    plt.close()

    valid_silhouettes = [score for score in silhouette_scores if score != -1]
    if valid_silhouettes:
        optimal_k = K[silhouette_scores.index(max(valid_silhouettes))]
    else:
        optimal_k = 2
    return optimal_k, elbow_image_path, silhouette_image_path

# Function to extract the most relevant terms dynamically for file grouping
def get_dynamic_topic(cluster_texts):
    vectorizer = TfidfVectorizer(stop_words='english')
    X = vectorizer.fit_transform(cluster_texts)
    feature_names = vectorizer.get_feature_names_out()
    dense = X.todense()
    summed = dense.sum(axis=0).A1
    top_n_indices = summed.argsort()[-3:][::-1]  # Top 3 words

    # Extract the top most relevant words as the topic
    top_n_words = [feature_names[i] for i in top_n_indices]
    return ' '.join(top_n_words[:2])  # Use the top 2 words as the cluster topic

# Endpoint to translate a file
@app.route("/translate", methods=["POST"])
def translate_file():
    data = request.json
    file_name = data.get("file_name")
    file_path = os.path.join(UPLOAD_FOLDER, file_name)

    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()

    try:
        translated = translator.translate(content, source="hi", target="en")
        return jsonify({"translated_text": translated})
    except Exception as e:
        return jsonify({"error": f"Translation failed: {e}"}), 500

# Endpoint to upload files
@app.route("/upload", methods=["POST"])
def upload_files():
    uploaded_files = request.files.getlist("files")
    file_paths = []
    for file in uploaded_files:
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(file_path)
        file_paths.append(file.filename)  # Store only filenames for serving later
    return jsonify({"file_paths": file_paths})

# Endpoint to process files and perform clustering
@app.route("/process", methods=["POST"])
def process_files():
    data = request.json
    file_paths = data.get("file_paths", [])
    texts, file_names, languages = [], [], []

    # Read and process each file
    for file_name in file_paths:
        file_path = os.path.join(UPLOAD_FOLDER, file_name)
        if file_path.endswith('.txt'):
            with open(file_path, 'r', encoding='utf-8') as file:
                text = file.read()
            lang = detect_language(text)
            preprocessed_text = preprocess_text(text, lang)
            texts.append(preprocessed_text)
            file_names.append(file_name)
            languages.append(lang)

    # Convert text data to TF-IDF features
    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(texts)

    # Find optimal clusters
    optimal_clusters, elbow_image_path, silhouette_image_path = find_optimal_clusters(X, max_clusters=10)
    kmeans = KMeans(n_clusters=optimal_clusters, n_init=10, random_state=42)
    kmeans.fit(X)
    labels = kmeans.labels_

    # Create clusters dictionary
    clusters = {}

    # Assign names to clusters based on content
    for cluster_num in set(labels):
        cluster_files = [texts[i] for i, label in enumerate(labels) if label == cluster_num]
        cluster_topic = get_dynamic_topic(cluster_files)  # Extract dynamic topic

        if cluster_topic not in clusters:
            clusters[cluster_topic] = []

        # Add files under this cluster
        for i, file_name in enumerate([file_names[i] for i, label in enumerate(labels) if label == cluster_num]):
            clusters[cluster_topic].append(file_name)

    return jsonify({
        "clusters": clusters,
        "elbow_graph": f"/static/graphs/{os.path.basename(elbow_image_path)}",
        "silhouette_graph": f"/static/graphs/{os.path.basename(silhouette_image_path)}"
    })

# Serve uploaded files so they open in the browser
@app.route("/files/<filename>")
def serve_file(filename):
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=False)  # Open in browser
    return jsonify({"error": "File not found"}), 404

# Serve the graph images
@app.route("/static/graphs/<filename>")
def serve_graphs(filename):
    return send_from_directory(GRAPH_FOLDER, filename)

if __name__ == "__main__":
    app.run(debug=True)
