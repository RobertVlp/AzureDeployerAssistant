using System.Text;

namespace AIAssistant.Services
{
    public class CapturingStream(Stream stream) : Stream
    {
        private readonly Stream _stream = stream;
        private readonly StringBuilder _capturedData = new();

        public string CapturedData => _capturedData.ToString();

        public override bool CanRead => _stream.CanRead;

        public override bool CanSeek => _stream.CanSeek;

        public override bool CanWrite => _stream.CanWrite;

        public override long Length => _stream.Length;

        public override long Position
        {
            get => _stream.Position;
            set => _stream.Position = value;
        }

        public override void Flush()
        {
            throw new InvalidOperationException("Synchronous operations are disallowed. Use FlushAsync instead.");
        }

        public override Task FlushAsync(CancellationToken cancellationToken)
        {
            return _stream.FlushAsync(cancellationToken);
        }

        public override int Read(byte[] buffer, int offset, int count)
        {
            return _stream.Read(buffer, offset, count);
        }

        public override long Seek(long offset, SeekOrigin origin)
        {
            return _stream.Seek(offset, origin);
        }

        public override void SetLength(long value)
        {
            _stream.SetLength(value);
        }

        public override void Write(byte[] buffer, int offset, int count)
        {
            throw new InvalidOperationException("Synchronous operations are disallowed. Use WriteAsync instead.");
        }

        public override async Task WriteAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
        {
            _capturedData.Append(Encoding.UTF8.GetString(buffer, offset, count));
            await _stream.WriteAsync(buffer.AsMemory(offset, count), cancellationToken);
        }

        public override async ValueTask WriteAsync(ReadOnlyMemory<byte> buffer, CancellationToken cancellationToken = default)
        {
            _capturedData.Append(Encoding.UTF8.GetString(buffer.Span));
            await _stream.WriteAsync(buffer, cancellationToken);
        }
    }
}
