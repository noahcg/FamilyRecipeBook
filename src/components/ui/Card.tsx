import { clsx } from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  muted?: boolean;
}

function Card({ padded = true, muted = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "recipe-card",
        padded && "p-4 sm:p-6",
        muted && "!bg-card-muted",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div className={clsx("mb-3", className)} {...props}>
      {children}
    </div>
  );
}

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}
function CardBody({ className, children, ...props }: CardBodyProps) {
  return (
    <div className={clsx("text-ink-muted text-sm leading-relaxed", className)} {...props}>
      {children}
    </div>
  );
}

export { Card, CardHeader, CardBody };
export type { CardProps };
