export function Layout({ children }: React.PropsWithChildren) {
  return (
    <div className='flex flex-col border-popup-border min-h-[10.5rem] w-[21rem] min-w-[21rem] border-8 p-3'>
      {children}
    </div>
  );
}
