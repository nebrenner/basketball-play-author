import React from "react";
import { usePlayStore } from "../../app/store";
import { findFrameById } from "../../features/frames/frameGraph";
import { defaultOptionTitle, defaultStepTitle } from "../../features/frames/frameLabels";

const FrameMetadataEditor: React.FC = () => {
  const currentFrame = usePlayStore((s) => s.currentFrame());
  const currentFrameIndex = usePlayStore((s) => s.currentFrameIndex);
  const play = usePlayStore((s) => s.play);
  const title = currentFrame?.title ?? "";
  const optionLabel = currentFrame?.optionLabel ?? "";
  const hasFrame = Boolean(currentFrame);
  const setTitle = usePlayStore((s) => s.setCurrentFrameTitle);
  const setOptionLabel = usePlayStore((s) => s.setCurrentFrameOptionLabel);
  const titleInputId = React.useId();
  const optionInputId = React.useId();

  const stepPlaceholder = hasFrame ? defaultStepTitle(currentFrameIndex + 1) : "No frame selected";

  let optionPlaceholder = "Option name";
  const canEditOption = Boolean(currentFrame?.parentId);
  if (hasFrame && currentFrame?.parentId && play) {
    const parent = findFrameById(play, currentFrame.parentId);
    if (parent && Array.isArray(parent.nextFrameIds)) {
      const optionIndex = parent.nextFrameIds.findIndex((id) => id === currentFrame.id);
      if (optionIndex >= 0) {
        optionPlaceholder = defaultOptionTitle(optionIndex + 1);
      }
    }
  }

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

  const handleOptionChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setOptionLabel(event.target.value);
    },
    [setOptionLabel],
  );

  const handleOptionBlur = React.useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      setOptionLabel(event.target.value.trim());
    },
    [setOptionLabel],
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
      {canEditOption ? (
        <div className="frame-note-field">
          <label htmlFor={optionInputId}>Option Label</label>
          <input
            id={optionInputId}
            type="text"
            value={optionLabel}
            onChange={handleOptionChange}
            onBlur={handleOptionBlur}
            placeholder={optionPlaceholder}
            disabled={!hasFrame}
          />
        </div>
      ) : hasFrame ? (
        <p className="frame-note-hint">Branch label is available for steps with a parent option.</p>
      ) : null}
    </div>
  );
};

export default FrameMetadataEditor;
