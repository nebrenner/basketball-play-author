import React from "react";
import { usePlayStore } from "../../app/store";
import { defaultStepTitle } from "../../features/frames/frameLabels";

const FrameMetadataEditor: React.FC = () => {
  const currentFrame = usePlayStore((s) => s.currentFrame());
  const currentFrameIndex = usePlayStore((s) => s.currentFrameIndex);
  const title = currentFrame?.title ?? "";
  const hasFrame = Boolean(currentFrame);
  const setTitle = usePlayStore((s) => s.setCurrentFrameTitle);
  const titleInputId = React.useId();

  const stepPlaceholder = hasFrame ? defaultStepTitle(currentFrameIndex + 1) : "No frame selected";

  const handleTitleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(event.target.value);
    },
    [setTitle],
  );

  const handleTitleBlur = React.useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      setTitle(event.target.value.trim());
    },
    [setTitle],
  );

  return (
    <div className="frame-note-area frame-metadata-area">
      <div className="frame-note-field">
        <label htmlFor={titleInputId}>Step Name</label>
        <input
          id={titleInputId}
          type="text"
          value={title}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          placeholder={stepPlaceholder}
          disabled={!hasFrame}
        />
      </div>
    </div>
  );
};

export default FrameMetadataEditor;
