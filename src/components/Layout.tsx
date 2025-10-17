export function Layout({ children }: React.PropsWithChildren) {
  return (
    <div className='border-popup-border flex min-h-[10.5rem] w-[21.25rem] min-w-[21.25rem] flex-col border-[0.5rem] p-3'>
      {children}
    </div>
  );
}
