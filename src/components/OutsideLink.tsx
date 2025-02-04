export function OutsideLink({ text }: { text: string }) {
  return (
    <a
      href='https://hdrezka.ag'
      target='_blank'
      className='font-bold text-link-color underline underline-offset-4'
    >
      {text}
    </a>
  );
}
