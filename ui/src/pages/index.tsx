import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {CHANNELS} from '@/constants/events';
import {FormEvent, useEffect, useState} from 'react';
import io, {type Socket} from 'socket.io-client';

type Message = {
  message: string;
  id: string;
  createdAt: string;
  port: string;
};

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://127.0.0.1';

function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketIo = io(SOCKET_URL, {
      reconnection: true,
      upgrade: true,
      transports: ['websocket', 'polling'],
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, []);

  return socket;
}

export default function Home() {
  const socket = useSocket();
  const [newMessage, setNewMessage] = useState<string>('');

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    socket?.on('connect', () => {
      console.log('connected');
    });

    socket?.on(CHANNELS.NEW_MESSAGE_CHANNEL, (message: Message) => {
      setMessages(prev => [message, ...prev]);
    });
  }, [socket]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!socket) return;

    setNewMessage('');
    socket.emit(CHANNELS.NEW_MESSAGE_CHANNEL, {
      message: newMessage,
    });
  };

  return (
    <main className='flex flex-col p-4 w-full max-w-3xl mx-auto'>
      {messages.map(m => (
        <li key={m.id}>{m.message}</li>
      ))}
      <form onSubmit={handleSubmit} className='flex items-center '>
        <Textarea
          className='rounded-lg mr-4'
          placeholder='Send a message'
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          maxLength={255}
        />

        <Button className='h-full'>Send message</Button>
      </form>
    </main>
  );
}
