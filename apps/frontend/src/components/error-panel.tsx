type Props = {
  message: string;
  onRetry?: () => void;
};

export const ErrorPanel = ({ message, onRetry }: Props) => {
  return (
    <div role='alert'>
      <p>{message}</p>
      {onRetry ? (
        <button type='button' onClick={onRetry}>
          再試行
        </button>
      ) : null}
    </div>
  );
};
