import React from "react";
import { usePlayStore } from "../../app/store";
const FrameNoteEditor: React.FC = () => {
  const currentFrame = usePlayStore((s) => s.currentFrame());
  const note = currentFrame?.note ?? "";
  const hasFrame = Boolean(currentFrame);
  const setNote = usePlayStore((s) => s.setCurrentFrameNote);
  const textareaId = React.useId();

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNote(event.target.value);
    },
    [setNote],
  );

  return (
    <div className="frame-note-area">
      <label htmlFor={textareaId}>Frame Notes</label>
      <textarea
        id={textareaId}
        value={note}
        onChange={handleChange}
        placeholder={hasFrame ? "Add notes for this frame" : "No frame selected"}
        disabled={!hasFrame}
      />
    </div>
  );
};

export default FrameNoteEditor;
