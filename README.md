<h1 align="left">
  Argvec
</h1>

Argvec is a quantum statevector visualizer with a drag-and-drop circuit builder for up to 5 qubits or 32 amplitudes. For each step it shows the whole statevector before and after the gate, and animates how the amplitudes evolve from one to the other.

Quantum mechanics is formulated over complex Hilbert spaces. Yet many of our common visual and pedagogical tools translate quantum states into real-valued representations, emphasizing geometry or probabilities over the complex amplitudes themselves.

This project was created out of curiosity for visualizing quantum states in their native complex representation, and how the statevector itself evolves through unitary transformations.

## User Interface

![Argvec](docs/screenshot.png)

## Features

- Drag gates onto any wire; drag them to move, or off the circuit to delete.
- Pauli, H, S, T, √X, Rx, Ry, Rz, P, U, SWAP, iSWAP and √SWAP, each with any number of controls.
- Amplitudes drawn as arrows (length = magnitude, colour = phase), with animated flows and tip-to-tail sums on mixers.
- An amplitude table and a mover / rotator / mixer label for every step.
- Bloch-sphere probes you can drop anywhere in the circuit.
- Built-in examples, light and dark themes, undo, keyboard shortcuts and touch support.

## Run it

It is a single static page with no build step. Open `index.html`, or serve the folder:

```sh
python3 -m http.server 8000
```

## Tests

```sh
node tests/run.js
```

Checks the gate engine against brute-force matrix multiplication on thousands of random gates.

## Conventions

q1 is the leftmost bit of a basis state, `|q1 q2 q3⟩`. Some libraries, such as Qiskit, use the opposite order.

## Credits

Favicon: the "atom" icon from [Lucide](https://lucide.dev), used under the ISC License (see [`assets/LICENSE-lucide.txt`](assets/LICENSE-lucide.txt)).

## License

[MIT](LICENSE)
