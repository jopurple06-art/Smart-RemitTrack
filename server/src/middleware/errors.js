export function notFound(_request, response) {
  response.status(404).json({ message: 'The requested resource was not found.' });
}

export function handleError(error, _request, response, _next) {
  if (error?.code === 11000) return response.status(409).json({ message: 'That record already exists.' });
  if (error?.name === 'ValidationError' || error?.name === 'CastError') {
    return response.status(400).json({ message: error.message });
  }
  console.error(error);
  response.status(error.status || 500).json({ message: error.status ? error.message : 'Something went wrong. Please try again.' });
}
