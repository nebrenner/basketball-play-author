import React from "react";
import { usePlayStore } from "../../app/store";
import { findFrameById } from "../../features/frames/frameGraph";
import { defaultOptionTitle, defaultStepTitle } from "../../features/frames/frameLabels";

const FrameNoteEditor: React.FC = () => {
  const currentFrame = usePlayStore((s) => s.currentFrame());
  const currentFrameIndex = usePlayStore((s) => s.currentFrameIndex);
  const play = usePlayStore((s) => s.play);
  const note = currentFrame?.note ?? "";
  const title = currentFrame?.title ?? "";
  const optionLabel = currentFrame?.optionLabel ?? "";
  const hasFrame = Boolean(currentFrame);
  const setNote = usePlayStore((s) => s.setCurrentFrameNote);
  const setTitle = usePlayStore((s) => s.setCurrentFrameTitle);
  const setOptionLabel = usePlayStore((s) => s.setCurrentFrameOptionLabel);
  const titleInputId = React.useId();
  const optionInputId = React.useId();
  const textareaId = React.useId();

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

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNote(event.target.value);
    },
    [setNote],
  );

  const handleTitleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(event.target.value);
    },
    [setTitle],
  );

  const handleOptionChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setOptionLabel(event.target.value);
    },
    [setOptionLabel],
  );

  return (
    <div className="frame-note-area">
      <div className="frame-note-field">
        <label htmlFor={titleInputId}>Step Name</label>
        <input
          id={titleInputId}
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder={stepPlaceholder}
          disabled={!hasFrame}
        />
      </div>
      <div className="frame-note-field">
        <label htmlFor={optionInputId}>Option Label</label>
        <input
          id={optionInputId}
          type="text"
          value={optionLabel}
          onChange={handleOptionChange}
          placeholder={optionPlaceholder}
          disabled={!hasFrame || !canEditOption}
        />
        {!canEditOption && (
          <p className="frame-note-hint">Branch label is available for steps with a parent option.</p>
        )}
      </div>
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
