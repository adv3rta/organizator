interface FilePreviewProps {
  path: string;
  alt: string;
}

const toFileUrl = (filePath: string): string => `file:///${filePath.replace(/\\/g, "/")}`;

export const FilePreview = ({ path, alt }: FilePreviewProps) => <img className="preview-image" src={toFileUrl(path)} alt={alt} />;
