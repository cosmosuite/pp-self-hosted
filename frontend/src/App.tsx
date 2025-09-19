import ImageProcessor from './components/ImageProcessor';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">SafeVision Content Moderation</h1>
          <p className="text-gray-600">AI-powered content detection and blurring with customizable rules</p>
        </div>
      </header>
      <main>
        <ImageProcessor />
      </main>
    </div>
  );
}

export default App;
