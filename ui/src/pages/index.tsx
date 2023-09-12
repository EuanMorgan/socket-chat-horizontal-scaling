import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {CHANNELS} from '@/constants/events';
import React, {FormEvent, useEffect, useState} from 'react';
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

  const [connectionCount, setConnectionCount] = useState<number>(0);

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight + 1000;
    }
  };

  useEffect(() => {
    socket?.on('connect', () => {
      console.log('connected');
    });

    socket?.on(CHANNELS.NEW_MESSAGE_CHANNEL, (message: Message) => {
      setMessages(prev => [...prev, message]);
      setTimeout(() => {
        scrollToBottom();
      }, 0);
    });

    socket?.on(
      CHANNELS.CONNECTION_COUNT_UPDATED_CHANNEL,
      ({count}: {count: number}) => {
        setConnectionCount(count);
      }
    );
  }, [socket]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!socket) return;

    setNewMessage('');
    socket.emit(CHANNELS.NEW_MESSAGE_CHANNEL, {
      message: newMessage,
    });
  };

  const listRef = React.useRef<HTMLOListElement>(null);

  return (
    <main className='flex flex-col p-4 w-full max-w-3xl mx-auto h-full'>
      <h1 className='text-4xl font-bold text-center mb-4'>
        Chat ({connectionCount})
      </h1>
      <ol ref={listRef} className='flex-1 overflow-y-scroll overflow-x-hidden'>
        {messages.map(m => (
          <li className='bg-gray-100 rounded-lg p-4 my-2 break-all' key={m.id}>
            <p className='text-sm text-gray-500'>{m.createdAt}</p>
            <p className='text-sm text-gray-500'>{m.port}</p>
            <p>{m.message}</p>
          </li>
        ))}
      </ol>
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
