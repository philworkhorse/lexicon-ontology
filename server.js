const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for lexicon data
app.get('/api/data', (req, res) => {
  try {
    const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'snapshot.json'), 'utf8'));
    
    // Build concept network from compounds
    const concepts = {};
    const edges = {};
    const compounds = snapshot.compounds || {};
    
    for (const [word, info] of Object.entries(compounds)) {
      const meanings = info.meanings || [];
      if (meanings.length < 2) continue;
      
      const m1 = meanings[0];
      const m2 = meanings[1];
      
      // Track concepts
      if (!concepts[m1]) concepts[m1] = { count: 0, partners: new Set(), words: [], category: null };
      if (!concepts[m2]) concepts[m2] = { count: 0, partners: new Set(), words: [], category: null };
      
      concepts[m1].count++;
      concepts[m2].count++;
      concepts[m1].partners.add(m2);
      concepts[m2].partners.add(m1);
      concepts[m1].words.push(word);
      concepts[m2].words.push(word);
      
      // Track edges
      const key = [m1, m2].sort().join('|');
      if (!edges[key]) edges[key] = { source: m1, target: m2, weight: 0, compounds: [] };
      edges[key].weight++;
      edges[key].compounds.push({ word, compound_meaning: info.compound_meaning, born: info.born });
    }
    
    // Categorize concepts based on their nature
    const categories = {
      natural: ['flower', 'tree', 'seed', 'stone', 'ocean', 'river', 'mountain', 'earth', 'fire', 'water', 'wind', 'rain', 'sky', 'cloud', 'moon', 'sun', 'star', 'ice', 'snow', 'light'],
      quality: ['slow', 'fast', 'small', 'far', 'deep', 'high', 'dark', 'bright', 'warm', 'cold', 'soft', 'hard', 'old', 'new', 'still', 'sharp', 'rough', 'smooth', 'heavy', 'open', 'empty', 'quiet', 'dense', 'dry'],
      action: ['move', 'fall', 'flow', 'turn', 'rise', 'hold', 'make', 'break', 'give', 'take', 'pull', 'push', 'sing', 'grow', 'join', 'cut', 'merge', 'drift', 'pass', 'scatter', 'begin', 'end', 'change', 'release', 'emerge'],
      relation: ['from', 'between', 'around', 'through', 'toward', 'within', 'beyond', 'upon', 'near', 'across', 'above', 'below', 'beside', 'under'],
      abstract: ['wave', 'boundary', 'cycle', 'pattern', 'time', 'space', 'order', 'self', 'threshold', 'connection', 'balance', 'whole', 'part', 'other', 'many', 'one', 'none', 'all', 'emergence', 'echo', 'form', 'void'],
      being: ['life', 'death', 'breath', 'voice', 'spirit', 'memory', 'dream', 'path']
    };
    
    for (const [concept, data] of Object.entries(concepts)) {
      let found = false;
      for (const [cat, words] of Object.entries(categories)) {
        if (words.includes(concept)) {
          data.category = cat;
          found = true;
          break;
        }
      }
      if (!found) data.category = 'unknown';
    }
    
    // Convert Sets to arrays for JSON
    const nodes = Object.entries(concepts).map(([name, data]) => ({
      id: name,
      count: data.count,
      partners: data.partners.size,
      category: data.category,
    }));
    
    const edgeList = Object.values(edges).map(e => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
      compounds: e.compounds,
    }));
    
    // Living words
    const living = Object.entries(snapshot.words || {}).map(([word, info]) => ({
      word,
      meaning: info.meaning,
      category: info.category,
      fitness: info.fitness,
      age: snapshot.generation - info.born,
    })).sort((a, b) => b.fitness - a.fitness);
    
    // Sound shifts
    const soundShifts = snapshot.sound_shifts || [];
    
    res.json({
      generation: snapshot.generation,
      stats: snapshot.stats,
      nodes,
      edges: edgeList,
      living,
      soundShifts,
      totalCompounds: Object.keys(compounds).length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3460;
app.listen(PORT, () => console.log(`Lexicon Ontology running on port ${PORT}`));
