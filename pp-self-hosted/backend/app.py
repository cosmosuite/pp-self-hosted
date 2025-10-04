from flask import Flask
from flask_cors import CORS
from routes.process import process_bp
import os

app = Flask(__name__)
CORS(app)

app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

app.register_blueprint(process_bp, url_prefix='/api')

@app.route('/')
def index():
    return {'message': 'Peep Peep Backend API', 'version': '1.0.0'}

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='localhost', port=port, debug=True)
