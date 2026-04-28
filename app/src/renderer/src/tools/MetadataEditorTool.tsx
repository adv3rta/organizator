import { useState } from "react";
import type { MetadataInspection, MetadataUpdateEntry } from "@adverta/shared";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";

export const MetadataEditorTool = () => {
  const [files, setFiles] = useState<MetadataInspection[]>([]);
  const [message, setMessage] = useState("");
  const [coverImages, setCoverImages] = useState<Record<string, string>>({});

  const pickFiles = async (): Promise<void> => {
    const response = await window.adverta.selectFiles({
      title: "Select files for metadata editing",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Supported", extensions: ["mp3", "pdf", "jpg", "jpeg", "png", "webp", "tif", "tiff"] }]
    });
    if (!response.canceled && response.filePaths.length) {
      const inspection = await window.adverta.inspectMetadata(response.filePaths);
      if (inspection.ok && inspection.data) {
        setFiles(inspection.data);
      }
    }
  };

  const updateField = (index: number, key: string, value: string) => {
    setFiles((current) =>
      current.map((file, fileIndex) =>
        fileIndex !== index
          ? file
          : {
              ...file,
              values: {
                ...file.values,
                [key]: key === "keywords" ? value.split(",").map((item) => item.trim()).filter(Boolean) : value
              }
            }
      )
    );
  };

  const updateName = (index: number, value: string) => {
    setFiles((current) => current.map((file, fileIndex) => (fileIndex !== index ? file : { ...file, fileName: value })));
  };

  const save = async (): Promise<void> => {
    const payload: MetadataUpdateEntry[] = files.map((file) => ({
      sourcePath: file.path,
      nextFileName: file.fileName,
      timestamps: file.timestamps,
      values: {
        title: file.values.title ?? "",
        author: file.values.author ?? "",
        album: file.values.album ?? "",
        comment: file.values.comment ?? "",
        keywords: file.values.keywords ?? []
      },
      coverImagePath: coverImages[file.path] ?? null
    }));
    const response = await window.adverta.updateMetadata(payload);
    setMessage(response.ok ? `Updated ${response.data?.files.length ?? 0} file(s).` : response.error?.message ?? "Failed.");
  };

  const pickCover = async (filePath: string): Promise<void> => {
    const response = await window.adverta.selectFiles({
      title: "Select cover image",
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg"] }]
    });
    if (!response.canceled && response.filePaths[0]) {
      setCoverImages((current) => ({ ...current, [filePath]: response.filePaths[0] }));
    }
  };

  return (
    <Card className="tool-panel tool-panel-wide" title="Metadata Editor" subtitle="Edit embedded metadata directly in supported files.">
      <div className="tool-panel-actions">
        <Button onClick={pickFiles}>Choose files</Button>
        <Button variant="primary" onClick={save} disabled={!files.length}>
          Save all changes
        </Button>
      </div>
      <div className="metadata-list">
        {files.map((file, index) => (
          <div key={file.path} className="metadata-item">
            <div className="metadata-item-head">
              <strong>{file.path.split("\\").pop()}</strong>
              <span>{file.capabilities.kind.toUpperCase()}</span>
            </div>
            <div className="field-grid">
              <Input label="File name" value={file.fileName} onChange={(event) => updateName(index, event.target.value)} />
              <Input
                label="Modified timestamp"
                type="datetime-local"
                value={file.timestamps.modifiedAt ? file.timestamps.modifiedAt.slice(0, 16) : ""}
                onChange={(event) =>
                  setFiles((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex !== index
                        ? entry
                        : {
                            ...entry,
                            timestamps: {
                              ...entry.timestamps,
                              modifiedAt: event.target.value ? new Date(event.target.value).toISOString() : null
                            }
                          }
                    )
                  )
                }
              />
              <Input label="Title" value={file.values.title ?? ""} onChange={(event) => updateField(index, "title", event.target.value)} disabled={!file.capabilities.supportsTitle} />
              <Input label="Author" value={file.values.author ?? ""} onChange={(event) => updateField(index, "author", event.target.value)} disabled={!file.capabilities.supportsAuthor} />
              <Input label="Album" value={file.values.album ?? ""} onChange={(event) => updateField(index, "album", event.target.value)} disabled={!file.capabilities.supportsAlbum} />
              <Input label="Comment" value={file.values.comment ?? ""} onChange={(event) => updateField(index, "comment", event.target.value)} disabled={!file.capabilities.supportsComment} />
              <Input
                label="Keywords"
                className="field-span"
                value={(file.values.keywords ?? []).join(", ")}
                onChange={(event) => updateField(index, "keywords", event.target.value)}
                disabled={!file.capabilities.supportsKeywords}
              />
              {file.capabilities.supportsCoverArt ? (
                <div className="inline-control field-span">
                  <Input label="Cover art" value={coverImages[file.path] ?? ""} readOnly placeholder="Optional cover image path" />
                  <div className="inline-control-button">
                    <Button onClick={() => pickCover(file.path)}>Choose image</Button>
                  </div>
                </div>
              ) : null}
            </div>
            {!file.capabilities.supportsEmbeddedTags ? <div className="inline-note">This format does not support embedded metadata writing in Adverta Tools.</div> : null}
          </div>
        ))}
      </div>
      {message ? <div className="tool-result">{message}</div> : null}
    </Card>
  );
};
