import { Button } from "./Button";

interface BackArrowProps {
  onClick: () => void;
}

export const BackArrow = ({ onClick }: BackArrowProps) => (
  <Button variant="icon" className="back-arrow" onClick={onClick} aria-label="Back">
    ←
  </Button>
);
