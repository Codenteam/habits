
```d2
style: {
  fill: transparent
}

direction: down

# Global styles - remove link decorations
**.style.underline: false

classes: {
  clickable: {
    style.underline: false
  }
}

sources: Sources {
  github: GitHub {
  }
  npm: NPM {
  }
}

types: Node Types {
  style.fill: "#1a365d"
  style.stroke: "#63b3ed"
  
  bits: Bits {
    style.fill: "#2c5282"
    style.stroke: "#90cdf4"
    style.font-color: "#bee3f8"
  }
  ap: ActivePieces {
    style.fill: "#2c5282"
    style.stroke: "#90cdf4"
    style.font-color: "#bee3f8"
  }
  n8n: n8n {
    style.fill: "#2c5282"
    style.stroke: "#90cdf4"
    style.font-color: "#bee3f8"
  }
}

definition: Create Automation/Logic/Workflow {
  link: /intersect/habits/deep-dive/creating
  style.fill: "#744210"
  style.stroke: "#f6ad55"
  
  m0: Using AI {
    link: /intersect/habits/getting-started/first-habit-using-ai
    shape: hexagon
    style.fill: "#975a16"
    style.stroke: "#fbd38d"
    style.font-color: "#fefcbf"
  }

  m1: Habits as Code {
    link: /intersect/habits/getting-started/first-habit-mixed
    shape: hexagon
    style.fill: "#975a16"
    style.stroke: "#fbd38d"
    style.font-color: "#fefcbf"
  }
  m2: Base UI {
    link: /intersect/habits/getting-started/first-habit
    shape: hexagon
    style.fill: "#975a16"
    style.stroke: "#fbd38d"
    style.font-color: "#fefcbf"
  }
  m3: Import {
    shape: hexagon
    style.fill: "#975a16"
    style.stroke: "#fbd38d"
    style.font-color: "#fefcbf"
  }
}

habits: HABITS Cortex {
  link: /intersect/habits/deep-dive/running
  style.fill: "#276749"
  style.stroke: "#68d391"
  style.font-color: "#c6f6d5"
  style.stroke-width: 3
}

deploy: Deployment Targets {
link: /intersect/habits/deep-dive/running
  style.fill: "#553c9a"
  style.stroke: "#b794f4"
  
  d1: Server {
    style.fill: "#6b46c1"
    style.stroke: "#d6bcfa"
    style.font-color: "#e9d8fd"
  }
  d2: Serverless {
    style.fill: "#6b46c1"
    style.stroke: "#d6bcfa"
    style.font-color: "#e9d8fd"
  }
  d3: Desktop {
    style.fill: "#6b46c1"
    style.stroke: "#d6bcfa"
    style.font-color: "#e9d8fd"
  }
  d4: Mobile {
    style.fill: "#6b46c1"
    style.stroke: "#d6bcfa"
    style.font-color: "#e9d8fd"
  }
}

sources -> definition: {
  style.stroke-dash: 3
  style.animated: true
}
types -> definition: {
  style.stroke-dash: 3
  style.animated: true
}
definition -> habits: {
  style.stroke-dash: 3
  style.animated: true
}
habits -> deploy: {
  style.stroke-dash: 3
  style.animated: true
}
```