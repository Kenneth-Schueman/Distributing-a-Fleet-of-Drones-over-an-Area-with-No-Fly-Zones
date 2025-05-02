import socket

def receive_file():
    server_address = ('localhost', 3000)
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(server_address)
    sock.listen(1)
    
    print('Waiting for a connection...')
    connection, client_address = sock.accept()
    
    try:
        print(f'Connection from {client_address}')
        
        with open('received_file', 'wb') as f:
            while True:
                data = connection.recv(1024)
                if not data:
                    break
                f.write(data)
                
        print('File received successfully.')
    
    finally:
        connection.close()

if __name__ == "__main__":
    receive_file()