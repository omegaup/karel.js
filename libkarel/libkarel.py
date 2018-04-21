# -*- coding: utf-8 -*-

"""Librería para parsear entradas y salidas de Karel en XML."""


import xml.etree.ElementTree as ET
import sys
from collections import defaultdict


def load():
    """Regresa (input, output, nombre de caso) para la ejecución actual"""
    with open('data.in', 'r') as data_in:
        return (KarelInput(data_in.read()), KarelOutput(sys.stdin.read()),
                sys.argv[1])


def load_dict():
    """Regresa un diccionario con información sobre la ejecución actual"""
    result = {
        'case_name': sys.argv[1],
        'contestant_output': KarelOutput(sys.stdin.read())
    }
    with open('data.in', 'r') as data_in:
        result['case_input'] = KarelInput(data_in.read())
    with open('data.out', 'r') as data_out:
        result['case_output'] = KarelOutput(data_out.read())
    return result


class Direccion(object):  # pylint: disable=R0903
    """Constantes para las máscara de bits de las paredes del mundo"""
    OESTE = 1
    NORTE = 2
    ESTE = 4
    SUR = 8


class KarelInput(object):
    """Representa un archivo .in."""

    def __init__(self, string):
        self.root = ET.fromstring(string)
        mundo = self.root.find('mundos/mundo').attrib
        self.__w = int(mundo['ancho'])
        self.__h = int(mundo['alto'])
        programa = self.root.find('programas/programa').attrib
        self.__x = int(programa['xKarel'])
        self.__y = int(programa['yKarel'])
        self.__direccion = programa['direccionKarel']
        self.__mochila = programa['mochilaKarel']
        if self.__mochila != 'INFINITO':
            self.__mochila = int(self.mochila)

        self.__despliega = [x.attrib['tipo'].upper() for x in
                            self.root.findall('programas/programa/despliega')]
        self.__despliega_orientacion = 'ORIENTACION' in self.despliega
        self.__despliega_mundo = 'MUNDO' in self.despliega
        self.__despliega_posicion = 'POSICION' in self.despliega
        self.__despliega_instrucciones = 'INSTRUCCIONES' in self.despliega

        lista_zumbadores = [
            {
                'x': int(x.attrib['x']),
                'y': int(x.attrib['y']),
                'zumbadores': x.attrib['zumbadores']
            } for x in self.root.findall('mundos/mundo/monton')]
        self.__zumbadores = {(x['x'], x['y']): x['zumbadores']
                             for x in lista_zumbadores}

        lista_dump = [{k: int(x.attrib[k]) for k in x.attrib} for x in
                      self.root.findall('mundos/mundo/posicionDump')]
        self.__dump = set((x['x'], x['y']) for x in lista_dump)

        self.__paredes = defaultdict(int)

        # pylint: disable=W0105
        """Las paredes se representan como el segmento que une
        dos puntos (x1,y1), (x2,y2) en el plano.

        Pensemos en el caso de una pared horizontal. Sin pérdida de
        generalidad, sea x1 > x2. El diagrama ilustra este caso:

               pared
                 |
        (x2, y2) v (x1, y1)
           * --------- *

           |           |
              (x1, y1) <- celda con una pared al norte
           |           |

           * - - - - - *

        El código asigna x = max(x1, x2), y = y1 = y2.
        Eso basta para saber cuáles son las dos celdas adyacentes
        a la pared. El caso vertical es análogo.

        En el XML se distingue del caso vertical u horizontal
        por la existencia o no de los atributos x2, y2, ya que
        se obvia el que está repetido.
        """
        for x in range(1, self.__w + 1):  # pylint: disable=C0103
            self.__paredes[(x, 0)] |= Direccion.NORTE
            self.__paredes[(x, 1)] |= Direccion.SUR
            self.__paredes[(x, self.__h)] |= Direccion.NORTE
            self.__paredes[(x, self.__h + 1)] |= Direccion.SUR

        for y in range(1, self.__h + 1):  # pylint: disable=C0103
            self.__paredes[(0, y)] |= Direccion.ESTE
            self.__paredes[(1, y)] |= Direccion.OESTE
            self.__paredes[(self.__w, y)] |= Direccion.ESTE
            self.__paredes[(self.__w + 1, y)] |= Direccion.OESTE

        for p in self.root.findall('mundos/mundo/pared'):  # pylint: disable=C0103
            x = int(p.attrib['x1'])  # pylint: disable=C0103
            y = int(p.attrib['y1'])  # pylint: disable=C0103

            if 'x2' in p.attrib:
                x = max(x, int(p.attrib['x2']))  # pylint: disable=C0103
                self.__paredes[(x, y)] |= Direccion.NORTE
                self.__paredes[(x, y + 1)] |= Direccion.SUR
            elif 'y2' in p.attrib:
                y = max(y, int(p.attrib['y2']))  # pylint: disable=C0103
                self.__paredes[(x, y)] |= Direccion.ESTE
                self.__paredes[(x + 1, y)] |= Direccion.OESTE

    @property
    def x(self):  # pylint: disable=C0103
        """La posición x inicial de Karel."""
        return self.__x

    @property
    def y(self):  # pylint: disable=C0103
        """La posición y inicial de Karel."""
        return self.__y

    @property
    def w(self):  # pylint: disable=C0103
        """El ancho del mundo."""
        return self.__w

    @property
    def h(self):  # pylint: disable=C0103
        """"El alto del mundo."""
        return self.__h

    @property
    def direccion(self):
        """La orientación inicial de Karel.

        Puede ser uno de ['NORTE', 'ESTE', 'SUR', 'OESTE'].
        """
        return self.__direccion

    @property
    def mochila(self):
        """El número de zumbadores en la mochila de Karel.

        Puede ser un entero o la cadena 'INFINITO'.
        """
        return self.__mochila

    @property
    def despliega(self):
        """Lista de elementos que se van a guardar en la salida.

        Puede ser uno de ['MUNDO', 'ORIENTACION', 'POSICION'].
        """
        return self.__despliega

    @property
    def despliega_posicion(self):
        """Si se va a desplegar la posición final de Karel en la salida."""
        return self.__despliega_posicion

    @property
    def despliega_orientacion(self):
        """Si se va a desplegar la orientación final de Karel en la salida."""
        return self.__despliega_orientacion

    @property
    def despliega_mundo(self):
        """Si se van a desplegar los zumbadores elegidos en la salida."""
        return self.__despliega_mundo

    @property
    def despliega_instrucciones(self):
        """Si se va a desplegar el número de instrucciones en la salida."""
        return self.__despliega_instrucciones

    @property
    def lista_zumbadores(self):
        """Un diccionario con los zumbadores.

        Cada llave (x, y) tiene como valor el número de zumbadores en esa
        casilla.
        """
        return self.__zumbadores

    def zumbadores(self, casilla_x, casilla_y):
        """Regresa el número de zumbadores para la casilla en (x, y).

        Si hay una cantidad infinita de zumbadores, regresa la cadena
        'INFINITO'.
        """
        if (casilla_x, casilla_y) not in self.__zumbadores:
            return 0
        zumbadores = self.__zumbadores[(casilla_x, casilla_y)]
        if zumbadores == 'INFINITO':
            return zumbadores
        return int(zumbadores)

    @property
    def mapa_paredes(self):
        """Un diccionario con las paredes del mundo.

        Cada llave (x, y) tiene como valor una máscara de bits
        con las paredes adyacentes a esa casilla.

        Las direcciones de la máscara están descritas en Direccion.
        """
        return defaultdict(self.__paredes)

    def paredes(self, casilla_x, casilla_y):
        """Regresa una máscara de bits con las direcciones en
        las que hay una pared en la casilla (x, y).

        Las direcciones de la máscara están descritas en Direccion.
        """

        return self.__paredes[(casilla_x, casilla_y)]

    @property
    def lista_dump(self):
        """El conjunto de casillas marcadas para generar una salida."""
        return self.__dump

    def dump(self, casilla_x, casilla_y):
        """Regresa True si la casilla está marcada para generar una salida."""
        return (casilla_x, casilla_y) in self.__dump

    def __repr__(self):
        """Imprime una versión bonita del objeto."""
        return '<libkarel.KarelInput %s>' % ', '.join('%s=%r' % x for x in {
            'x': self.x,
            'y': self.y,
            'mochila': self.mochila,
            'direccion': self.direccion,
            'despliega': self.despliega,
        }.items())


class KarelOutput(object):
    """Representa un archivo .out."""

    def __init__(self, string):
        self.root = ET.fromstring(string)
        self.__zumbadores = {}
        for linea in self.root.findall('mundos/mundo/linea'):
            pos_y = int(linea.attrib['fila'])
            pos_x = 0
            for token in linea.text.strip().split():
                if token[0] == '(':
                    pos_x = int(token[1:-1])
                else:
                    self.__zumbadores[(pos_x, pos_y)] = token
                    pos_x += 1

        programa = self.root.find('programas/programa')
        self.__resultado = programa.attrib['resultadoEjecucion']
        karel = self.root.find('programas/programa/karel')
        self.__x = None
        self.__y = None
        self.__direccion = None
        if karel is not None:
            if 'x' in karel.attrib:
                self.__x = int(karel.attrib['x'])
                self.__y = int(karel.attrib['y'])
            if 'direccion' in karel.attrib:
                self.__direccion = karel.attrib['direccion']

        self.__instrucciones = {
            'avanza': None,
            'gira_izquierda': None,
            'coge_zumbador': None,
            'deja_zumbador': None,
        }
        instrucciones = self.root.find('programas/programa/instrucciones')
        if instrucciones is not None:
            for k in self.__instrucciones:
                if k in instrucciones.attrib:
                    self.__instrucciones[k] = int(instrucciones.attrib[k])

    @property
    def x(self):  # pylint: disable=C0103
        """La posición x final de Karel. None si no se hizo dump posición."""
        return self.__x

    @property
    def y(self):  # pylint: disable=C0103
        """La posición y final de Karel. None si no se hizo dump posición."""
        return self.__y

    @property
    def direccion(self):
        """La orientación final de Karel.

        Puede ser uno de ['NORTE', 'ESTE', 'SUR', 'OESTE'], o None si no se
        hizo dump orientación."""
        return self.__direccion

    @property
    def resultado(self):
        """Una cadena con el resultado de la ejecución.

        'FIN PROGRAMA' significa ejecución exitosa.
        """
        return self.__resultado

    @property
    def error(self):
        """True si no fue una ejecución exitosa."""
        return self.resultado != 'FIN PROGRAMA'

    @property
    def lista_zumbadores(self):
        """Un diccionario con los zumbadores.

        Cada llave (x, y) tiene como valor el número de zumbadores en esa
        casilla al final de la ejecución.
        """
        return self.__zumbadores

    @property
    def instrucciones(self):
        """Un diccionario con el número de instrucciones que karel ejecutó"""
        return self.__instrucciones

    def zumbadores(self, casilla_x, casilla_y):
        """Regresa el número de zumbadores para la casilla en (x, y)

        Si hay una cantidad infinita de zumbadores, regresa la cadena
        'INFINITO'.
        """
        if (casilla_x, casilla_y) not in self.__zumbadores:
            return 0
        zumbadores = self.__zumbadores[(casilla_x, casilla_y)]
        if zumbadores == 'INFINITO':
            return zumbadores
        return int(zumbadores)

    def __repr__(self):
        """Imprime una versión bonita del objeto"""
        return '<libkarel.KarelOutput %s>' % ', '.join('%s=%r' % x for x in {
            'x': self.x,
            'y': self.y,
            'direccion': self.direccion,
            'resultado': self.resultado,
            'error': self.error,
        }.items())

# vim: tabstop=4 expandtab shiftwidth=4 softtabstop=4
