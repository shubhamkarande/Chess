class ChessGame {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.gameHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameStatus = 'active';
        this.soundEnabled = true;
        this.moveCount = 0;
        this.isVsComputer = false;
        this.computerColor = 'black';
        this.aiDifficulty = 'medium'; // easy, medium, hard
        this.isComputerThinking = false;
        
        this.initializeUI();
        this.renderBoard();
        this.updateGameInfo();
    }

    initializeBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        // Place pawns
        for (let col = 0; col < 8; col++) {
            board[1][col] = { type: 'pawn', color: 'black' };
            board[6][col] = { type: 'pawn', color: 'white' };
        }
        
        // Place other pieces
        const pieceOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        for (let col = 0; col < 8; col++) {
            board[0][col] = { type: pieceOrder[col], color: 'black' };
            board[7][col] = { type: pieceOrder[col], color: 'white' };
        }
        
        return board;
    }

    initializeUI() {
        document.getElementById('newGame').addEventListener('click', () => this.newGame());
        document.getElementById('undoMove').addEventListener('click', () => this.undoMove());
        document.getElementById('toggleSound').addEventListener('click', () => this.toggleSound());
        document.getElementById('toggleGameMode').addEventListener('click', () => this.toggleGameMode());
    }

    renderBoard() {
        const boardElement = document.getElementById('chessBoard');
        boardElement.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                const piece = this.board[row][col];
                if (piece) {
                    square.innerHTML = this.getPieceSymbol(piece);
                    square.classList.add('piece');
                }
                
                square.addEventListener('click', (e) => this.handleSquareClick(e));
                boardElement.appendChild(square);
            }
        }
    }

    getPieceSymbol(piece) {
        const symbols = {
            white: {
                king: '♔', queen: '♕', rook: '♖', 
                bishop: '♗', knight: '♘', pawn: '♙'
            },
            black: {
                king: '♚', queen: '♛', rook: '♜', 
                bishop: '♝', knight: '♞', pawn: '♟'
            }
        };
        return symbols[piece.color][piece.type];
    }

    handleSquareClick(event) {
        if (this.gameStatus !== 'active' || this.isComputerThinking) return;
        
        // In vs computer mode, only allow human player moves
        if (this.isVsComputer && this.currentPlayer === this.computerColor) return;
        
        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);
        
        if (this.selectedSquare) {
            if (this.selectedSquare.row === row && this.selectedSquare.col === col) {
                this.clearSelection();
                return;
            }
            
            if (this.isValidMove(this.selectedSquare.row, this.selectedSquare.col, row, col)) {
                this.makeMove(this.selectedSquare.row, this.selectedSquare.col, row, col);
                this.clearSelection();
                return;
            }
        }
        
        const piece = this.board[row][col];
        if (piece && piece.color === this.currentPlayer) {
            this.selectSquare(row, col);
        } else {
            this.clearSelection();
        }
    }

    selectSquare(row, col) {
        this.selectedSquare = { row, col };
        this.highlightSquares();
    }

    clearSelection() {
        this.selectedSquare = null;
        this.clearHighlights();
    }

    highlightSquares() {
        this.clearHighlights();
        
        if (!this.selectedSquare) return;
        
        const { row, col } = this.selectedSquare;
        const selectedElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        selectedElement.classList.add('selected');
        
        // Highlight valid moves
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.isValidMove(row, col, r, c)) {
                    const targetElement = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                    if (this.board[r][c]) {
                        targetElement.classList.add('capture-move');
                    } else {
                        targetElement.classList.add('valid-move');
                    }
                }
            }
        }
    }

    clearHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'valid-move', 'capture-move', 'in-check');
        });
    } 
   isValidMove(fromRow, fromCol, toRow, toCol) {
        // Basic bounds checking
        if (toRow < 0 || toRow >= 8 || toCol < 0 || toCol >= 8) return false;
        
        const piece = this.board[fromRow][fromCol];
        if (!piece) return false;
        
        const targetPiece = this.board[toRow][toCol];
        
        // Can't capture own pieces
        if (targetPiece && targetPiece.color === piece.color) return false;
        
        // Check piece-specific movement rules
        if (!this.isValidPieceMove(piece, fromRow, fromCol, toRow, toCol)) return false;
        
        // Check if move would put own king in check
        if (this.wouldBeInCheck(fromRow, fromCol, toRow, toCol, piece.color)) return false;
        
        return true;
    }

    isValidPieceMove(piece, fromRow, fromCol, toRow, toCol) {
        const rowDiff = toRow - fromRow;
        const colDiff = toCol - fromCol;
        const absRowDiff = Math.abs(rowDiff);
        const absColDiff = Math.abs(colDiff);
        
        switch (piece.type) {
            case 'pawn':
                return this.isValidPawnMove(piece, fromRow, fromCol, toRow, toCol);
            case 'rook':
                return (rowDiff === 0 || colDiff === 0) && this.isPathClear(fromRow, fromCol, toRow, toCol);
            case 'bishop':
                return absRowDiff === absColDiff && this.isPathClear(fromRow, fromCol, toRow, toCol);
            case 'queen':
                return (rowDiff === 0 || colDiff === 0 || absRowDiff === absColDiff) && 
                       this.isPathClear(fromRow, fromCol, toRow, toCol);
            case 'king':
                return absRowDiff <= 1 && absColDiff <= 1;
            case 'knight':
                return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
            default:
                return false;
        }
    }

    isValidPawnMove(piece, fromRow, fromCol, toRow, toCol) {
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;
        const rowDiff = toRow - fromRow;
        const colDiff = Math.abs(toCol - fromCol);
        
        // Forward move
        if (colDiff === 0) {
            if (this.board[toRow][toCol]) return false; // Can't move forward to occupied square
            if (rowDiff === direction) return true; // One square forward
            if (fromRow === startRow && rowDiff === 2 * direction) return true; // Two squares from start
        }
        
        // Diagonal capture
        if (colDiff === 1 && rowDiff === direction) {
            return this.board[toRow][toCol] && this.board[toRow][toCol].color !== piece.color;
        }
        
        return false;
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
        const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
        
        let currentRow = fromRow + rowStep;
        let currentCol = fromCol + colStep;
        
        while (currentRow !== toRow || currentCol !== toCol) {
            if (this.board[currentRow][currentCol]) return false;
            currentRow += rowStep;
            currentCol += colStep;
        }
        
        return true;
    }

    wouldBeInCheck(fromRow, fromCol, toRow, toCol, color) {
        // Make temporary move
        const originalPiece = this.board[toRow][toCol];
        const movingPiece = this.board[fromRow][fromCol];
        this.board[toRow][toCol] = movingPiece;
        this.board[fromRow][fromCol] = null;
        
        const inCheck = this.isInCheck(color);
        
        // Restore board
        this.board[fromRow][fromCol] = movingPiece;
        this.board[toRow][toCol] = originalPiece;
        
        return inCheck;
    }

    isInCheck(color) {
        const kingPosition = this.findKing(color);
        if (!kingPosition) return false;
        
        // Check if any opponent piece can attack the king
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color !== color) {
                    if (this.canPieceAttack(piece, row, col, kingPosition.row, kingPosition.col)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    canPieceAttack(piece, fromRow, fromCol, toRow, toCol) {
        return this.isValidPieceMove(piece, fromRow, fromCol, toRow, toCol);
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        
        // Save move for history
        const move = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: { ...piece },
            capturedPiece: capturedPiece ? { ...capturedPiece } : null,
            boardState: this.board.map(row => row.map(cell => cell ? { ...cell } : null))
        };
        
        this.gameHistory.push(move);
        
        // Handle captured piece
        if (capturedPiece) {
            this.capturedPieces[capturedPiece.color].push(capturedPiece);
            this.playSound('capture');
        } else {
            this.playSound('move');
        }
        
        // Make the move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Handle pawn promotion
        if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
            this.board[toRow][toCol] = { type: 'queen', color: piece.color };
            this.playSound('promotion');
        }
        
        // Switch players
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.moveCount++;
        
        // Check game status
        this.checkGameStatus();
        
        // Update UI
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
        this.updateCapturedPieces();
        
        // Trigger computer move if it's computer's turn
        if (this.isVsComputer && this.currentPlayer === this.computerColor && this.gameStatus === 'active') {
            this.makeComputerMove();
        }
    }    
checkGameStatus() {
        const opponentColor = this.currentPlayer;
        const inCheck = this.isInCheck(opponentColor);
        
        if (inCheck) {
            // Highlight king in check
            const kingPos = this.findKing(opponentColor);
            if (kingPos) {
                setTimeout(() => {
                    const kingElement = document.querySelector(`[data-row="${kingPos.row}"][data-col="${kingPos.col}"]`);
                    kingElement.classList.add('in-check');
                }, 100);
            }
        }
        
        if (this.isCheckmate(opponentColor)) {
            this.gameStatus = 'checkmate';
            this.playSound('checkmate');
        } else if (this.isStalemate(opponentColor)) {
            this.gameStatus = 'stalemate';
        } else if (inCheck) {
            this.gameStatus = 'check';
            this.playSound('check');
        } else {
            this.gameStatus = 'active';
        }
    }

    isCheckmate(color) {
        if (!this.isInCheck(color)) return false;
        return !this.hasValidMoves(color);
    }

    isStalemate(color) {
        if (this.isInCheck(color)) return false;
        return !this.hasValidMoves(color);
    }

    hasValidMoves(color) {
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                if (piece && piece.color === color) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    updateGameInfo() {
        const playerName = this.isVsComputer && this.currentPlayer === this.computerColor ? 'Computer' : 
                          this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1);
        document.getElementById('currentPlayer').textContent = playerName;
        
        document.getElementById('gameMode').textContent = this.isVsComputer ? 'Player vs Computer' : 'Player vs Player';
        
        const statusElement = document.getElementById('gameStatus');
        switch (this.gameStatus) {
            case 'check':
                statusElement.textContent = `${playerName} is in check!`;
                statusElement.style.color = '#dc2626';
                break;
            case 'checkmate':
                const winner = this.currentPlayer === 'white' ? 'Black' : 'White';
                const winnerName = this.isVsComputer ? 
                    (winner.toLowerCase() === this.computerColor ? 'Computer' : 'Player') : winner;
                statusElement.textContent = `Checkmate! ${winnerName} wins!`;
                statusElement.style.color = '#dc2626';
                break;
            case 'stalemate':
                statusElement.textContent = 'Stalemate! Game is a draw.';
                statusElement.style.color = '#f59e0b';
                break;
            default:
                statusElement.textContent = 'Game in progress';
                statusElement.style.color = '#16a34a';
        }
    }

    updateMoveHistory() {
        const moveList = document.getElementById('moveList');
        const lastMove = this.gameHistory[this.gameHistory.length - 1];
        
        if (lastMove) {
            const moveNumber = Math.ceil(this.gameHistory.length / 2);
            const isWhiteMove = this.gameHistory.length % 2 === 1;
            
            let moveEntry = document.querySelector(`[data-move="${moveNumber}"]`);
            if (!moveEntry) {
                moveEntry = document.createElement('div');
                moveEntry.className = 'move-entry';
                moveEntry.dataset.move = moveNumber;
                moveEntry.innerHTML = `<span class="move-number">${moveNumber}.</span><span class="white-move"></span><span class="black-move"></span>`;
                moveList.appendChild(moveEntry);
            }
            
            const moveNotation = this.getMoveNotation(lastMove);
            const moveSpan = moveEntry.querySelector(isWhiteMove ? '.white-move' : '.black-move');
            moveSpan.textContent = moveNotation;
            
            moveList.scrollTop = moveList.scrollHeight;
        }
    }

    getMoveNotation(move) {
        const { piece, from, to, capturedPiece } = move;
        const pieceSymbol = piece.type === 'pawn' ? '' : piece.type.charAt(0).toUpperCase();
        const fromSquare = String.fromCharCode(97 + from.col) + (8 - from.row);
        const toSquare = String.fromCharCode(97 + to.col) + (8 - to.row);
        const capture = capturedPiece ? 'x' : '';
        
        return `${pieceSymbol}${capture}${toSquare}`;
    }

    updateCapturedPieces() {
        const capturedWhiteElement = document.getElementById('capturedWhite');
        const capturedBlackElement = document.getElementById('capturedBlack');
        
        capturedWhiteElement.innerHTML = this.capturedPieces.white
            .map(piece => `<span class="captured-piece">${this.getPieceSymbol(piece)}</span>`)
            .join('');
            
        capturedBlackElement.innerHTML = this.capturedPieces.black
            .map(piece => `<span class="captured-piece">${this.getPieceSymbol(piece)}</span>`)
            .join('');
    }

    playSound(type) {
        if (!this.soundEnabled) return;
        
        // Create audio context for sound effects
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch (type) {
            case 'move':
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                break;
            case 'capture':
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                break;
            case 'check':
                oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
                break;
            case 'checkmate':
                oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
                break;
            case 'promotion':
                oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
                break;
        }
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    }

    newGame() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.gameHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameStatus = 'active';
        this.moveCount = 0;
        this.isComputerThinking = false;
        
        document.getElementById('moveList').innerHTML = '';
        document.getElementById('aiThinking').style.display = 'none';
        
        this.renderBoard();
        this.updateGameInfo();
        this.updateCapturedPieces();
        
        // If computer plays white, make first move
        if (this.isVsComputer && this.computerColor === 'white') {
            this.makeComputerMove();
        }
    }

    undoMove() {
        if (this.gameHistory.length === 0) return;
        
        const lastMove = this.gameHistory.pop();
        this.board = lastMove.boardState;
        
        // Remove captured piece from captured pieces array
        if (lastMove.capturedPiece) {
            const capturedArray = this.capturedPieces[lastMove.capturedPiece.color];
            capturedArray.pop();
        }
        
        // Switch back to previous player
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.moveCount--;
        this.gameStatus = 'active';
        
        // Update move history display
        const moveList = document.getElementById('moveList');
        const moveNumber = Math.ceil((this.gameHistory.length + 1) / 2);
        const isWhiteMove = (this.gameHistory.length + 1) % 2 === 1;
        
        const moveEntry = document.querySelector(`[data-move="${moveNumber}"]`);
        if (moveEntry) {
            if (isWhiteMove) {
                moveEntry.querySelector('.white-move').textContent = '';
                if (moveEntry.querySelector('.black-move').textContent === '') {
                    moveEntry.remove();
                }
            } else {
                moveEntry.querySelector('.black-move').textContent = '';
            }
        }
        
        this.renderBoard();
        this.updateGameInfo();
        this.updateCapturedPieces();
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        document.getElementById('toggleSound').textContent = `Sound: ${this.soundEnabled ? 'ON' : 'OFF'}`;
    }

    toggleGameMode() {
        this.isVsComputer = !this.isVsComputer;
        document.getElementById('toggleGameMode').textContent = this.isVsComputer ? 'vs Player' : 'vs Computer';
        
        // Reset game when switching modes
        this.newGame();
    }

    makeComputerMove() {
        if (this.gameStatus !== 'active' || this.currentPlayer !== this.computerColor) return;
        
        this.isComputerThinking = true;
        document.getElementById('aiThinking').style.display = 'flex';
        
        // Add delay to simulate thinking
        setTimeout(() => {
            const bestMove = this.getBestMove(this.computerColor);
            if (bestMove) {
                this.makeMove(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col);
            }
            
            this.isComputerThinking = false;
            document.getElementById('aiThinking').style.display = 'none';
        }, 500 + Math.random() * 1500); // Random delay between 0.5-2 seconds
    }

    getBestMove(color) {
        const allMoves = this.getAllValidMoves(color);
        if (allMoves.length === 0) return null;
        
        switch (this.aiDifficulty) {
            case 'easy':
                return this.getRandomMove(allMoves);
            case 'medium':
                return this.getMediumMove(allMoves, color);
            case 'hard':
                return this.getHardMove(allMoves, color);
            default:
                return this.getRandomMove(allMoves);
        }
    }

    getAllValidMoves(color) {
        const moves = [];
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                if (piece && piece.color === color) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
                                moves.push({
                                    from: { row: fromRow, col: fromCol },
                                    to: { row: toRow, col: toCol },
                                    piece: piece,
                                    capturedPiece: this.board[toRow][toCol]
                                });
                            }
                        }
                    }
                }
            }
        }
        return moves;
    }

    getRandomMove(moves) {
        return moves[Math.floor(Math.random() * moves.length)];
    }

    getMediumMove(moves, color) {
        // Prioritize captures and checks
        const captureMoves = moves.filter(move => move.capturedPiece);
        const checkMoves = moves.filter(move => this.wouldGiveCheck(move, color));
        
        if (captureMoves.length > 0) {
            // Prefer capturing higher value pieces
            captureMoves.sort((a, b) => this.getPieceValue(b.capturedPiece) - this.getPieceValue(a.capturedPiece));
            return captureMoves[0];
        }
        
        if (checkMoves.length > 0) {
            return checkMoves[Math.floor(Math.random() * checkMoves.length)];
        }
        
        // Otherwise random move
        return this.getRandomMove(moves);
    }

    getHardMove(moves, color) {
        // Simple minimax with evaluation
        let bestMove = null;
        let bestScore = color === 'white' ? -Infinity : Infinity;
        
        for (const move of moves) {
            const score = this.evaluateMove(move, color);
            
            if (color === 'white' && score > bestScore) {
                bestScore = score;
                bestMove = move;
            } else if (color === 'black' && score < bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove || this.getRandomMove(moves);
    }

    evaluateMove(move, color) {
        // Make temporary move
        const originalPiece = this.board[move.to.row][move.to.col];
        this.board[move.to.row][move.to.col] = move.piece;
        this.board[move.from.row][move.from.col] = null;
        
        let score = this.evaluatePosition();
        
        // Bonus for captures
        if (move.capturedPiece) {
            score += this.getPieceValue(move.capturedPiece) * (color === 'white' ? 1 : -1);
        }
        
        // Bonus for checks
        const opponentColor = color === 'white' ? 'black' : 'white';
        if (this.isInCheck(opponentColor)) {
            score += 50 * (color === 'white' ? 1 : -1);
        }
        
        // Restore board
        this.board[move.from.row][move.from.col] = move.piece;
        this.board[move.to.row][move.to.col] = originalPiece;
        
        return score;
    }

    evaluatePosition() {
        let score = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    const pieceValue = this.getPieceValue(piece);
                    score += piece.color === 'white' ? pieceValue : -pieceValue;
                }
            }
        }
        
        return score;
    }

    getPieceValue(piece) {
        const values = {
            pawn: 10,
            knight: 30,
            bishop: 30,
            rook: 50,
            queen: 90,
            king: 900
        };
        return values[piece.type] || 0;
    }

    wouldGiveCheck(move, color) {
        // Make temporary move
        const originalPiece = this.board[move.to.row][move.to.col];
        this.board[move.to.row][move.to.col] = move.piece;
        this.board[move.from.row][move.from.col] = null;
        
        const opponentColor = color === 'white' ? 'black' : 'white';
        const givesCheck = this.isInCheck(opponentColor);
        
        // Restore board
        this.board[move.from.row][move.from.col] = move.piece;
        this.board[move.to.row][move.to.col] = originalPiece;
        
        return givesCheck;
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});