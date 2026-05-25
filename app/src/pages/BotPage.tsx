import { useEffect } from 'react';
import { botConfig } from '../config';
import BotHero from '../sections/BotHero';
import ChatDemo from '../sections/ChatDemo';
import BotCommands from '../sections/BotCommands';
import BotHowToAdd from '../sections/BotHowToAdd';
import Footer from '../sections/Footer';

export default function BotPage() {
  useEffect(() => {
    document.title = botConfig.siteTitle;
    let metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = botConfig.siteDescription;
  }, []);

  return (
    <>
      <main>
        <BotHero />
        <ChatDemo />
        <BotCommands />
        <BotHowToAdd />
      </main>
      <Footer />
    </>
  );
}
