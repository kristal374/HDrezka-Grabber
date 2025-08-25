export function OutsideLink({ url, text }: { url: string; text: string }) {
  return (
    <a
      href={url}
      target='_blank'
      className='font-bold text-link-color underline underline-offset-4'
    >
      {text}
    </a>
  );
}
