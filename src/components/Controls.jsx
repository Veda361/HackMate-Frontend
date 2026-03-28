export default function Controls({ onMute, onVideo, onEnd }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-6 bg-gray-900 px-6 py-3 rounded-full shadow-lg">

      <button onClick={onMute} className="bg-gray-700 p-3 rounded-full">
        🎤
      </button>

      <button onClick={onVideo} className="bg-gray-700 p-3 rounded-full">
        📷
      </button>

      <button className="bg-gray-700 p-3 rounded-full">
        🖥️
      </button>

      <button onClick={onEnd} className="bg-red-500 p-4 rounded-full">
        ❌
      </button>

    </div>
  );
}