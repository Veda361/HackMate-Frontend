export default function VideoGrid({ localStream, remoteStream }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 w-full h-full">

      {/* Remote */}
      <video
        autoPlay
        ref={(ref) => ref && (ref.srcObject = remoteStream)}
        className="w-full h-full object-cover rounded-xl bg-black"
      />

      {/* Local */}
      <video
        autoPlay
        muted
        ref={(ref) => ref && (ref.srcObject = localStream)}
        className="w-full h-full object-cover rounded-xl bg-black"
      />

    </div>
  );
}