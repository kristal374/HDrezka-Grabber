export function Layout({ children }: React.PropsWithChildren) {
  return (
    <div className='border-popup-border flex min-h-[10.5rem] min-w-[21rem] flex-col border-8 p-3'>
      {children}
    </div>
  );
}
