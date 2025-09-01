export function OutsideLink({ url, text }: { url: string; text: string }) {
  return (
    <a
      href={url}
      target='_blank'
      className='text-link-color font-bold underline underline-offset-4'
    >
      {text}
    </a>
  );
}
