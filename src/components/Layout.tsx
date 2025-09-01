export function Layout({ children }: React.PropsWithChildren) {
  return (
    <div className='border-popup-border flex min-w-[21rem] flex-col border-8 p-3'>
      {children}
    </div>
  );
}
